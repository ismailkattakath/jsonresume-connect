// SPDX-FileCopyrightText: 2026 Ismail Kattakath
// SPDX-License-Identifier: MIT

/**
 * The add-on's one custom step for Google Workspace Studio.
 * (Its display name is APP_NAME below, kept equal to appsscript.json by a test.)
 *
 * Each run: loads the signed-in user's resume from jsonresume.org ("Connect
 * JSON Resume", OAuth 2.1 + PKCE), checks it against the jsonresume.org schema
 * (an invalid shape FAILS the step; it is never repaired), and renders it into
 * a document for Google Docs in the user's Drive (RenderDoc.gs). Outputs: the Doc's id, its
 * link and its PDF/DOCX export links, plus the resume's name, headline and
 * email, the resume as JSON and as plain text.
 *
 * WHAT THIS STEP DELIBERATELY DOES NOT DO: tailor the resume, or read a job
 * posting. Tailoring lives in another tool. A posting is attacker-controlled
 * text; this code never touches one.
 *
 * Schema: https://github.com/jsonresume/resume-schema (verified 2026-09-30 —
 * top-level sections basics, work, volunteer, education, awards, certificates,
 * publications, skills, languages, interests, references, projects, meta).
 */

// Hard cap. A remote document is not under our control, so it is bounded
// rather than trusted.
var MAX_BYTES = 2 * 1024 * 1024; // a resume.json far past this is not a resume

// Sections rendered into resumeText, in the order a reader expects them.
var TEXT_SECTIONS = [
  'work',
  'projects',
  'education',
  'skills',
  'certificates',
  'awards',
];

/**
 * ONE SOURCE ON PURPOSE (operator decision, 2026-10-27): the signed-in user's
 * own jsonresume.org resume, through "Sign in with JSON Resume" (OAuth 2.1,
 * PKCE). No URL, paste or Drive field. Connecting tells the user they need a
 * JSON Resume account, and its dashboard keeps the resume (a GitHub gist it
 * creates for them; GitHub sign-in is required there, measured in upstream's
 * gistOperations.js on 2026-10-27).
 *
 * Proven live 2026-10-27: Studio renders the AuthorizationException card in a
 * step, /usercallback completes the sign-in, onExecute reads the token.
 * Studio does not redraw the card after sign-in, and reopening the step does
 * not help either; a page refresh does (live, 2026-10-27), so the card says so.
 */
var JR_ORIGIN = 'https://jsonresume.org';

/**
 * The add-on's display name. It must equal addOns.common.name and the step's
 * name in appsscript.json; a test fails if the three drift. It is repeated in
 * code only because jsonresume.org's consent screen shows it (client_name),
 * and Apps Script cannot read the manifest at run time.
 */
var APP_NAME = 'JSON Resume Connect';

// Section ids, so Disconnect can replace the connected section in place.
var CARD_SECTION_ID = 'jsonresume_connection';

/**
 * Configuration card. Not connected: the Connect JSON Resume card (thrown as
 * an AuthorizationException, the shape Studio rendered live). Connected: who
 * is connected, the optional title field, and Disconnect.
 *
 * Takes no event and does not prefill: Studio re-renders a saved value itself
 * through the field binding (see connectedCard).
 */
function onConfigJsonResumeToDoc() {
  var service;
  var authorizationUrl = '';
  try {
    service = jsonResumeService();
    if (!service.hasAccess()) authorizationUrl = service.getAuthorizationUrl();
  } catch (err) {
    // Client registration can fail (jsonresume.org down). An uncaught throw
    // would show the user a raw error; show a sentence instead.
    console.error('JsonResumeToDoc: sign-in unavailable: ' + err.message);
    return unavailableCard();
  }
  if (authorizationUrl) {
    // Outside the try: throwException IS a throw, and Studio needs it.
    CardService.newAuthorizationException()
      .setAuthorizationUrl(authorizationUrl)
      .setResourceDisplayName('JSON Resume')
      .setCustomUiCallback('jsonResumeConnectCard')
      .throwException();
  }
  return connectedCard();
}

/**
 * The connected card. Each field's setFieldName MUST equal a manifest
 * inputs[].id: that binding is how the value reaches onExecute, and its title
 * matches that input's manifest description. Every field accepts variables
 * (setIncludeVariables), so an earlier step can supply it.
 *
 * The two "for later steps" fields replace only the Name and email outputs;
 * the Doc always shows the resume as it is (readOverrides).
 */
function connectedCard() {
  var who = PropertiesService.getUserProperties().getProperty('JR_USERNAME');
  var section = CardService.newCardSection()
    .setId(CARD_SECTION_ID)
    .addWidget(
      CardService.newTextParagraph().setText(
        'Connected to <b>JSON Resume</b>' +
          (who ? ' as <b>@' + escapeHtml(who) + '</b>' : '') +
          '. Each run loads your resume from jsonresume.org and renders it as a document ' +
          'for Google Docs™ in your Drive, with PDF and DOCX download links. ' +
          'This step can only see the files it creates.'
      )
    )
    .addWidget(
      stepTextInput(
        'title',
        'Document title',
        'Optional. Defaults to "{your name} — Resume".'
      )
    )
    .addWidget(
      CardService.newTextParagraph().setText(
        '<b>For later steps</b> (optional). These replace the Name and ' +
          'email variables only. The Doc always shows your resume as it is.'
      )
    )
    .addWidget(
      stepTextInput(
        'overrideName',
        'Name for later steps',
        'Replaces the Name variable. Default: basics.name.'
      )
    )
    .addWidget(
      stepTextInput(
        'overrideEmail',
        'Email for later steps',
        'Replaces the Resume email address variable. Default: basics.email.'
      )
    )
    .addWidget(
      CardService.newTextButton()
        .setText('Disconnect')
        .setOnClickAction(
          CardService.newAction().setFunctionName('disconnectJsonResume')
        )
    );
  return CardService.newCardBuilder().addSection(section).build();
}

/** A card text field bound to a manifest input, accepting earlier steps' variables. */
function stepTextInput(fieldName, title, hint) {
  return CardService.newTextInput()
    .setFieldName(fieldName)
    .setTitle(title)
    .setHint(hint)
    .setHostAppDataSource(
      CardService.newHostAppDataSource().setWorkflowDataSource(
        CardService.newWorkflowDataSource().setIncludeVariables(true)
      )
    );
}

/** The custom sign-in card a public add-on needs instead of Google's generic one. */
function jsonResumeConnectCard() {
  var url;
  try {
    url = jsonResumeService().getAuthorizationUrl();
  } catch (err) {
    console.error('JsonResumeToDoc: sign-in unavailable: ' + err.message);
    return [unavailableCard()];
  }
  return [CardService.newCardBuilder().addSection(connectSection(url)).build()];
}

/** The Connect JSON Resume section, shared by the sign-in card and Disconnect. */
function connectSection(url) {
  return CardService.newCardSection()
    .setId(CARD_SECTION_ID)
    .addWidget(
      CardService.newTextParagraph().setText(
        'Connect your <b>JSON Resume</b> account to load your resume. ' +
          'No account yet? Create one at <a href="https://jsonresume.org">jsonresume.org</a> ' +
          '(sign in with GitHub) and add your resume in its dashboard.'
      )
    )
    .addWidget(
      CardService.newTextButton()
        .setText('Connect JSON Resume')
        .setAuthorizationAction(
          CardService.newAuthorizationAction().setAuthorizationUrl(url)
        )
    )
    .addWidget(
      CardService.newTextParagraph().setText(
        // Bold, not a link: Studio strips <b> around and inside a card link, and
        // opens card links in a NEW tab, so a link cannot refresh this page
        // (measured live 2026-10-27).
        'After connecting, <b>refresh</b> this page.'
      )
    );
}

/** Shown instead of a raw error when sign-in cannot be offered right now. */
function unavailableCard() {
  return CardService.newCardBuilder()
    .addSection(
      CardService.newCardSection()
        .setId(CARD_SECTION_ID)
        .addWidget(
          CardService.newTextParagraph().setText(
            'JSON Resume sign-in is unavailable right now. Try again in a few minutes.'
          )
        )
    )
    .build();
}

/**
 * Disconnect: forget the tokens, then swap the connected section for the
 * Connect section IN PLACE.
 *
 * Not CardService navigation: Studio's configuration-card guide says
 * navigation methods are not supported in Studio add-ons, and its update-cards
 * guide returns AddOnsResponseService modifyCard actions instead
 * (https://developers.google.com/workspace/add-ons/studio/update-cards,
 * read 2026-10-27). NOT YET RUN LIVE.
 */
function disconnectJsonResume() {
  var service = jsonResumeService();
  service.reset();
  PropertiesService.getUserProperties().deleteProperty('JR_USERNAME');
  var modify = AddOnsResponseService.newAction().addModifyCard(
    AddOnsResponseService.newModifyCard().setReplaceSection(
      connectSection(service.getAuthorizationUrl())
    )
  );
  return AddOnsResponseService.newRenderActionBuilder()
    .setAction(modify)
    .build();
}

/** OAuth2 for Apps Script (vendored at aae9287, the #513 public-client refresh fix). */
function jsonResumeService() {
  return OAuth2.createService('jsonresume')
    .setAuthorizationBaseUrl(JR_ORIGIN + '/oauth/authorize')
    .setTokenUrl(JR_ORIGIN + '/api/oauth/token')
    .setClientId(jsonResumeClientId())
    .setScope('resume:read')
    .generateCodeVerifier()
    .setCallbackFunction('jsonResumeAuthCallback')
    .setPropertyStore(PropertiesService.getUserProperties())
    .setCache(CacheService.getUserCache())
    .setLock(LockService.getUserLock());
}

function jsonResumeAuthCallback(request) {
  var ok = jsonResumeService().handleCallback(request);
  return HtmlService.createHtmlOutput(
    ok
      ? 'Connected to JSON Resume. Return to Workspace Studio and refresh the page.'
      : 'Not connected. Return to Workspace Studio and try again.'
  );
}

/**
 * The client id, registered once per deployment through jsonresume.org's
 * self-serve dynamic client registration (public client, no secret; measured
 * 2026-10-27). Kept in Script Properties: an identifier, not a secret.
 * client_name is what jsonresume.org's consent screen shows; a client
 * registered before the rename keeps its old name until re-registered.
 * Throws when registration fails; callers turn that into a sentence.
 */
function jsonResumeClientId() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('JR_CLIENT_ID');
  if (id) return id;
  var response = UrlFetchApp.fetch(JR_ORIGIN + '/api/oauth/register', {
    method: 'post',
    contentType: 'application/json',
    muteHttpExceptions: true,
    payload: JSON.stringify({
      client_name: APP_NAME,
      redirect_uris: [
        'https://script.google.com/macros/d/' +
          ScriptApp.getScriptId() +
          '/usercallback',
      ],
    }),
  });
  if (response.getResponseCode() >= 300) {
    throw new Error(
      'jsonresume.org client registration returned HTTP ' +
        response.getResponseCode()
    );
  }
  id = JSON.parse(response.getContentText()).client_id;
  props.setProperty('JR_CLIENT_ID', id);
  return id;
}

/** HTTP statuses that a retry can cure: rate limits and server errors. */
function isTransientStatus(status) {
  return status === 429 || status >= 500;
}

/**
 * Runs when the step executes.
 *
 * MUST return every output declared in appsscript.json, or fail the step with
 * a message the user can act on (failStep).
 *
 * Failure policy:
 * - Not connected, no resume, an invalid resume: the step FAILS, actionable,
 *   not retried. The user fixes it.
 * - jsonresume.org or Drive unreachable, 429 or 5xx: the step FAILS as
 *   RETRYABLE (Studio reruns it up to five times) and not actionable.
 * - A styling call fails: the step SUCCEEDS with the Doc as imported
 *   (renderResumeDoc logs the reason to Executions).
 *
 * The user sees plain sentences only. HTTP codes, Google's error text and
 * exception messages go to Executions (console.error), never the resume or
 * a token.
 */
function onExecuteJsonResumeToDoc(event) {
  // The envelope only: the resume itself is personal data and never logged.
  // The live payload shape is pinned in the tests (LIVE_EVENT).
  var inputs =
    (event &&
      event.workflow &&
      event.workflow.actionInvocation &&
      event.workflow.actionInvocation.inputs) ||
    {};
  console.log(
    'JsonResumeToDoc inputs present: ' + JSON.stringify(Object.keys(inputs))
  );

  var loaded = loadResume();
  if (loaded.error) {
    // A retryable failure is a whole sentence of its own (design review
    // wording); the rest complete "Could not load resume: ...".
    return loaded.retry
      ? failStep(loaded.error, {retry: true})
      : failStep('Could not load resume: ' + loaded.error);
  }
  var resume = loaded.resume;
  var overrides = readOverrides(inputs);
  if (overrides.error) return failStep(overrides.error);

  // The email output is EMAIL_ADDRESS, and Studio needs every declared output
  // on every run: a missing one fails with "Missing required output
  // variables", an empty one with "Output contains an invalid email address"
  // (both measured live, 2026-10-27). So with no usable address from the
  // resume or the step, it fails here, before any Doc, with a fix to make.
  var basics = isPlainObject(resume.basics) ? resume.basics : {};
  if (!overrides.email && !safeEmail(basics.email)) {
    return failStep(
      'Could not load resume: it has no valid email address. Add one as ' +
        'basics.email in the jsonresume.org editor, or set "Email for later ' +
        'steps" in this step.'
    );
  }

  var doc;
  try {
    doc = renderResumeDoc(
      ScriptApp.getOAuthToken(),
      resume,
      docTitleFor(resume, readActionInput(inputs, 'title'))
    );
  } catch (err) {
    console.error('JsonResumeToDoc: Doc create failed: ' + err.message);
    return docCreateFailure(err.status);
  }

  var out = buildOutputs(doc.id, doc.webViewLink, resume, doc.name);
  if (overrides.name) out.name = overrides.name;
  if (overrides.email) out.email = overrides.email;
  return outputs(out);
}

/**
 * The step's optional values for later steps: { name, email } or { error }.
 *
 * They replace only the Name and email OUTPUTS. The Doc, its title and the
 * Resume (JSON / plain text) outputs always show the resume as it is: a Doc
 * that silently differs from the resume is confusing (operator, 2026-10-27).
 *
 * A set but invalid email fails the step, actionable: silently falling back
 * to the resume would hide the typo.
 */
function readOverrides(inputs) {
  var name = readActionInput(inputs, 'overrideName');
  var email = readActionInput(inputs, 'overrideEmail');
  if (email && !safeEmail(email)) {
    return {
      error:
        '"Email for later steps" is not a valid email address. Fix it, or clear it to use your resume\'s.',
    };
  }
  return {name: name, email: safeEmail(email)};
}

/** A failed Doc create, in the user's terms. `status` is unset for a network error. */
function docCreateFailure(status) {
  if (status === 401 || status === 403) {
    return failStep(
      'Google refused to create the Doc. Check that the add-on is still allowed to create files in your Drive.'
    );
  }
  if (!status || isTransientStatus(status)) {
    return failStep(
      'Google Drive is not responding. The step will try again.',
      {retry: true}
    );
  }
  return failStep(
    'Google Drive could not create the Doc from this resume. Try again later, or check the resume in the jsonresume.org dashboard.'
  );
}

/**
 * The signed-in user's resume from jsonresume.org, validated.
 * Returns { resume } or { error, retry }. A non-retryable error completes the
 * sentence "Could not load resume: ..."; a retryable one is a whole sentence.
 * Both are in the user's terms. Never throws.
 */
function loadResume() {
  var service;
  try {
    service = jsonResumeService();
  } catch (err) {
    console.error('JsonResumeToDoc: sign-in unavailable: ' + err.message);
    return {
      error:
        'JSON Resume sign-in is unavailable right now. The step will try again.',
      retry: true,
    };
  }
  if (!service.hasAccess()) {
    return {
      error:
        'not connected to JSON Resume. Open this step and click "Connect JSON Resume".',
    };
  }

  var raw;
  try {
    var response = UrlFetchApp.fetch(JR_ORIGIN + '/api/oauth/resume', {
      headers: {
        Authorization: 'Bearer ' + service.getAccessToken(),
        Accept: 'application/json',
      },
      muteHttpExceptions: true,
    });
    var status = response.getResponseCode();
    if (status === 401) {
      service.reset();
      return {
        error:
          'the JSON Resume connection expired or was revoked. Open this step and connect again.',
      };
    }
    if (status === 404) {
      return {
        error:
          'your JSON Resume account has no resume yet. Create it in the jsonresume.org dashboard.',
      };
    }
    if (status < 200 || status >= 300) {
      console.error('JsonResumeToDoc: jsonresume.org answered HTTP ' + status);
      if (isTransientStatus(status)) {
        return {
          error: 'jsonresume.org is not responding. The step will try again.',
          retry: true,
        };
      }
      return {
        error:
          'jsonresume.org refused the request. Open this step, click Disconnect, then connect JSON Resume again.',
      };
    }
    raw = response.getContentText();
  } catch (err) {
    console.error(
      'JsonResumeToDoc: jsonresume.org fetch failed: ' + err.message
    );
    return {
      error: 'Could not reach jsonresume.org. The step will try again.',
      retry: true,
    };
  }

  if (raw.length > MAX_BYTES) {
    return {
      error:
        'the document exceeds the ' +
        Math.round(MAX_BYTES / 1024 / 1024) +
        ' MB limit.',
    };
  }

  var payload;
  try {
    payload = JSON.parse(raw);
  } catch (err) {
    return {error: 'jsonresume.org did not return JSON.'};
  }
  // The endpoint wraps it: { username, url, resume } (measured 2026-10-27).
  var unwrapped = unwrapResumePayload(payload);
  if (unwrapped.username)
    PropertiesService.getUserProperties().setProperty(
      'JR_USERNAME',
      unwrapped.username
    );

  var problem = resumeProblem(unwrapped.resume);
  return problem ? {error: problem} : {resume: unwrapped.resume};
}

/**
 * Why a value is not a usable jsonresume.org resume, or '' when it is.
 * The resume FAILS on a drifted shape rather than being repaired (operator
 * decision, 2026-10-27): the fix belongs in the source.
 */
function resumeProblem(resume) {
  if (!isPlainObject(resume)) return 'the document is not a JSON object.';
  // Every field in JSON Resume is optional, so presence of one known section
  // is the floor; resumeShapeProblems then checks the types of what is there.
  if (!hasAnyKnownSection(resume)) {
    return (
      'no jsonresume.org sections found ' +
      '(expected at least one of basics, work, education, skills, projects).'
    );
  }
  var problems = resumeShapeProblems(resume);
  if (problems.length) {
    return (
      'it does not match the jsonresume.org schema: ' +
      problems.slice(0, 5).join('; ') +
      (problems.length > 5 ? ' (and ' + (problems.length - 5) + ' more)' : '') +
      '.'
    );
  }
  return '';
}

/**
 * Every declared output, every time — as a PLAIN MAP of strings.
 *
 * Split from the Apps Script envelope (outputs) on purpose: this half is pure
 * JavaScript and can therefore be tested off Google's servers, which is where
 * the output contract actually gets checked. docName is the name Drive stored
 * (files.create returns it), so a chip shows the title actually used.
 *
 * The chip labels (manifest descriptions) follow Google's built-in "Create a
 * doc" step, measured live 2026-10-27: "Link to doc", "Doc name", "Document
 * ID". Its fourth, "Doc location", is left out: the Doc is always created in
 * My Drive's root, so the value would be a constant that tells the user
 * nothing.
 */
function buildOutputs(docId, docUrl, resume, docName) {
  var r = isPlainObject(resume) ? resume : {};
  var basics = isPlainObject(r.basics) ? r.basics : {};
  return {
    docId: str(docId),
    docUrl: str(docUrl),
    docName: str(docName),
    pdfUrl: exportUrl(docId, 'pdf'),
    docxUrl: exportUrl(docId, 'docx'),
    name: str(basics.name),
    label: str(basics.label),
    email: str(basics.email),
    resumeText: toPlainText(r),
    resume: JSON.stringify(r),
  };
}

/**
 * Fails the step with a message the USER can read in the flow's Activity tab.
 *
 * The first version smuggled the reason into `resumeText` and returned success.
 * That is wrong twice over: the flow carries on as if it had a resume, and the
 * Activity tab — the only place a non-developer looks — shows nothing but the
 * step's name.
 *
 * Two pairs (Studio "handle errors" guide, read 2026-10-27):
 * - default ACTIONABLE + NOT_RETRYABLE: the user fixes it (connect, create or
 *   fix the resume); a retry cannot help.
 * - {retry: true} NOT_ACTIONABLE + RETRYABLE: a service was unreachable or
 *   overloaded; Studio "attempts to run the step again up to five times".
 */
function failStep(message, opts) {
  var retry = !!(opts && opts.retry);
  var workflowAction = AddOnsResponseService.newReturnElementErrorAction()
    .setErrorLog(
      AddOnsResponseService.newWorkflowTextFormat().addTextFormatElement(
        AddOnsResponseService.newTextFormatElement().setText(message)
      )
    )
    .setErrorActionability(
      retry
        ? AddOnsResponseService.ErrorActionability.NOT_ACTIONABLE
        : AddOnsResponseService.ErrorActionability.ACTIONABLE
    )
    .setErrorRetryability(
      retry
        ? AddOnsResponseService.ErrorRetryability.RETRYABLE
        : AddOnsResponseService.ErrorRetryability.NOT_RETRYABLE
    );
  var hostAppAction =
    AddOnsResponseService.newHostAppAction().setWorkflowAction(workflowAction);
  return AddOnsResponseService.newRenderActionBuilder()
    .setHostAppAction(hostAppAction)
    .build();
}

/**
 * Wraps the output map in what Workspace Studio actually expects back.
 *
 * NOT a plain object. A step returns a RenderAction carrying a
 * ReturnOutputVariablesAction; returning the bare map errors the step. Verified
 * against Google's own examples, which use
 * `AddOnsResponseService.newVariableData().addStringValue(...)` and
 * `newReturnOutputVariablesAction().setVariableDataMap(...)`.
 *
 * `email` is the one EMAIL_ADDRESS output (manifest): Studio's "Draft an
 * email" To field offers only email-address variables, never text (live,
 * 2026-10-27). It goes through addEmailAddress after safeEmail(). Every
 * declared output must be returned, so the run has already failed (see
 * onExecuteJsonResumeToDoc) if the resume has no usable address.
 */
function outputs(plain) {
  var variableDataMap = {};
  Object.keys(plain).forEach(function (key) {
    if (key === 'email') {
      variableDataMap.email =
        AddOnsResponseService.newVariableData().addEmailAddress(
          safeEmail(plain.email)
        );
      return;
    }
    variableDataMap[key] =
      AddOnsResponseService.newVariableData().addStringValue(plain[key]);
  });

  var workflowAction =
    AddOnsResponseService.newReturnOutputVariablesAction().setVariableDataMap(
      variableDataMap
    );
  var hostAppAction =
    AddOnsResponseService.newHostAppAction().setWorkflowAction(workflowAction);
  return AddOnsResponseService.newRenderActionBuilder()
    .setHostAppAction(hostAppAction)
    .build();
}

function hasAnyKnownSection(resume) {
  var known = [
    'basics',
    'work',
    'education',
    'skills',
    'projects',
    'volunteer',
    'awards',
    'certificates',
    'publications',
    'languages',
    'interests',
    'references',
  ];
  for (var i = 0; i < known.length; i++) {
    if (Object.prototype.hasOwnProperty.call(resume, known[i])) return true;
  }
  return false;
}

// The jsonresume.org v1 schema's sections that are arrays of objects.
var RESUME_ARRAY_SECTIONS = [
  'work',
  'volunteer',
  'education',
  'awards',
  'certificates',
  'publications',
  'skills',
  'languages',
  'interests',
  'references',
  'projects',
];
// Its fields that are arrays of strings, wherever they appear.
var RESUME_STRING_LIST_FIELDS = ['highlights', 'keywords', 'courses', 'roles'];
// Its date fields, which the schema constrains to the "iso8601" pattern.
var RESUME_DATE_FIELDS = ['startDate', 'endDate', 'date', 'releaseDate'];
var ISO8601_PARTIAL =
  /^([1-2][0-9]{3}-[0-1][0-9]-[0-3][0-9]|[1-2][0-9]{3}-[0-1][0-9]|[1-2][0-9]{3})$/;

/**
 * Structural check against the jsonresume.org v1 schema. A drifted shape
 * FAILS the step, loudly, rather than rendering quietly or being repaired
 * (operator decision, 2026-10-27): the fix belongs in the source.
 * Unknown extra keys are allowed (the schema allows them too).
 */
function resumeShapeProblems(resume) {
  var problems = [];
  if ('basics' in resume && !isPlainObject(resume.basics))
    problems.push('basics must be an object');
  if (
    isPlainObject(resume.basics) &&
    'name' in resume.basics &&
    typeof resume.basics.name !== 'string'
  ) {
    problems.push('basics.name must be a string');
  }
  RESUME_ARRAY_SECTIONS.forEach(function (section) {
    if (!(section in resume)) return;
    var list = resume[section];
    if (!Array.isArray(list)) {
      problems.push(section + ' must be an array');
      return;
    }
    list.forEach(function (entry, i) {
      var at = section + '[' + i + ']';
      if (!isPlainObject(entry)) {
        problems.push(at + ' must be an object');
        return;
      }
      RESUME_STRING_LIST_FIELDS.forEach(function (field) {
        if (!(field in entry)) return;
        var v = entry[field];
        if (
          !Array.isArray(v) ||
          v.some(function (s) {
            return typeof s !== 'string';
          })
        ) {
          problems.push(at + '.' + field + ' must be an array of strings');
        }
      });
      RESUME_DATE_FIELDS.forEach(function (field) {
        if (!(field in entry) || entry[field] === '') return;
        if (
          typeof entry[field] !== 'string' ||
          !ISO8601_PARTIAL.test(entry[field])
        ) {
          problems.push(
            at + '.' + field + ' must be YYYY, YYYY-MM or YYYY-MM-DD'
          );
        }
      });
    });
  });
  return problems;
}

function isPlainObject(v) {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

/**
 * Flattens a resume to plain text for an AI step's context window.
 *
 * Deliberately lossy and deliberately plain: the consumer is a language model
 * reading prose, not a renderer. `resume` still carries the full JSON for any
 * step that needs structure.
 */
function toPlainText(resume) {
  var basics =
    resume.basics && typeof resume.basics === 'object' ? resume.basics : {};
  var lines = [];

  if (basics.name) lines.push(str(basics.name));
  if (basics.label) lines.push(str(basics.label));
  var contact = [str(basics.email), str(basics.phone), str(basics.url)].filter(
    nonEmpty
  );
  if (contact.length) lines.push(contact.join(' · '));
  if (basics.summary) lines.push('', str(basics.summary));

  TEXT_SECTIONS.forEach(function (key) {
    var items = resume[key];
    if (!Array.isArray(items) || !items.length) return;
    lines.push('', key.toUpperCase());
    items.forEach(function (item) {
      if (!item || typeof item !== 'object') return;
      lines.push(headlineFor(key, item));
      if (item.summary) lines.push('  ' + str(item.summary));
      if (Array.isArray(item.highlights)) {
        item.highlights.forEach(function (h) {
          if (nonEmpty(str(h))) lines.push('  - ' + str(h));
        });
      }
      if (Array.isArray(item.keywords) && item.keywords.length) {
        lines.push('  ' + item.keywords.map(str).filter(nonEmpty).join(', '));
      }
    });
  });

  return lines
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * One headline line per entry.
 *
 * The section shapes genuinely differ — work has position+name, education has
 * studyType+area+institution, skills has name+level — so a single generic
 * formatter would drop the field that matters in each. Verified against the
 * published schema rather than guessed.
 */
function headlineFor(key, item) {
  var dates = [
    str(item.startDate),
    str(item.endDate) || (item.startDate ? 'present' : ''),
  ]
    .filter(nonEmpty)
    .join(' – ');
  var head;

  if (key === 'education') {
    head = [str(item.studyType), str(item.area)].filter(nonEmpty).join(' ');
    head = [head, str(item.institution)].filter(nonEmpty).join(' — ');
  } else if (key === 'skills' || key === 'languages' || key === 'interests') {
    head = [
      str(item.name) || str(item.language),
      str(item.level) || str(item.fluency),
    ]
      .filter(nonEmpty)
      .join(' — ');
    return head; // these carry no dates
  } else if (key === 'certificates' || key === 'awards') {
    head = [
      str(item.name) || str(item.title),
      str(item.issuer) || str(item.awarder),
    ]
      .filter(nonEmpty)
      .join(' — ');
    var when = str(item.date);
    return when ? head + '  (' + when + ')' : head;
  } else {
    // work, projects, volunteer, publications
    head = [
      str(item.position) || str(item.role),
      str(item.name) || str(item.organization),
    ]
      .filter(nonEmpty)
      .join(' — ');
  }

  return dates ? head + '  (' + dates + ')' : head;
}

/**
 * Reads one configured value out of a Studio action-invocation payload.
 *
 * The entry carries a TYPED ARRAY keyed by basic type — `stringValues` for a
 * STRING input, `integerValues` for an INTEGER — matching the manifest's
 * declared dataType. Google's calculator does exactly this:
 *
 *   event.workflow.actionInvocation.inputs["value1"].integerValues[0]
 *
 * Note this is NOT the generic add-on card shape
 * (`formInputs[field].stringInputs.value[0]`). That one is real, and correct for
 * a Gmail or Chat card callback — it is simply a different object than a Studio
 * step execution delivers.
 */
function readActionInput(inputs, id) {
  var entry = inputs && inputs[id];
  if (!entry || typeof entry !== 'object') return '';
  // stringValues, or an email-typed array: an EMAIL_ADDRESS input's key is
  // not documented. Numbers and booleans never read as text. An object value
  // (an address with a display name) gives its address.
  var keys = Object.keys(entry).filter(function (k) {
    return (
      (k === 'stringValues' || /^email.*Values$/i.test(k)) &&
      Array.isArray(entry[k]) &&
      entry[k].length
    );
  });
  if (!keys.length) return '';
  var key = keys.indexOf('stringValues') >= 0 ? 'stringValues' : keys[0];
  var v = entry[key][0];
  if (v && typeof v === 'object') {
    v = v.email || v.emailAddress || v.address || v.value || '';
  }
  return str(v).trim();
}

function str(v) {
  return v === null || v === undefined ? '' : String(v);
}

function nonEmpty(v) {
  return !!v && String(v).length > 0;
}

/** { username, resume } from /api/oauth/resume's body; a bare resume is accepted too. */
function unwrapResumePayload(payload) {
  if (
    payload &&
    typeof payload === 'object' &&
    !Array.isArray(payload) &&
    payload.resume &&
    typeof payload.resume === 'object'
  ) {
    return {username: str(payload.username), resume: payload.resume};
  }
  return {username: '', resume: payload};
}
