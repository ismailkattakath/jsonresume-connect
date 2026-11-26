# Notes from building it

These were **wrong in the first version** and are corrected here. The first draft of the README
presented the wrong shape as a hard-won lesson, which is worse than saying nothing — it would
have stopped the next person re-checking.

- **A Studio step does NOT read `commonEventObject.formInputs`.** That shape is real and correct
  for a Gmail or Chat card callback, and it is the wrong object here. A step execution delivers
  its configured values at `event.workflow.actionInvocation.inputs[id].stringValues[0]` — typed
  arrays keyed by the manifest's declared `dataType`. At execute time `commonEventObject` holds
  only `timeZone`, `userLocale`, `hostApp` and `platform`; there is no `formInputs` key at all.
  Google's calculator reads `…inputs["value1"].integerValues[0]`.
- **A configuration field must be declared in the manifest's `inputs[]`.** There is no
  "config-only field". The card's `setFieldName('x')` binds to `inputs[].id === 'x'`, and that
  binding *is* the delivery channel — Google's own sample carries the comment
  `//"FieldName" must match an "id" in the manifest file's inputs[] array.` With `"inputs": []`
  the widget is an orphan and the typed value has nowhere to arrive.
- **`onConfigFunction` takes no event parameter and does not prefill.** Every Studio example
  declares it bare. No Studio page uses `setValue` to restore a saved field — Studio re-renders
  saved values itself through the binding above.
- **`onExecuteFunction` must return a `RenderAction`, not a plain object.** Wrap the outputs in
  `AddOnsResponseService.newReturnOutputVariablesAction().setVariableDataMap(...)`. Returning a
  bare `{id: value}` map errors the step.
- **Fail with `newReturnElementErrorAction().setErrorLog(...)`.** Writing the reason into a
  string output and returning success is wrong twice: the flow continues as though it has a
  résumé, and the Activity tab — the only place a non-developer looks — shows nothing but the
  step's name.
- **`setHostAppDataSource(...setIncludeVariables(true))` on the TextInput**, or the user cannot
  pipe a variable from an earlier step into the field.
- **Shape check, not schema validation.** Every JSON Resume field is optional, so the only
  honest assertion is that one known section exists. A stricter gate rejects sparse résumés.
- **One step, not two (2026-10-27).** Load JSON Resume and Render JSON Resume to Doc became one
  step. The step id changed to `jsonResumeToDoc`, so a flow built on either old step must re-add
  it. The OAuth service name, `JR_CLIENT_ID` and `JR_USERNAME` did not change, so a connection
  carries over. The JSON-text input and its ```` ```json ```` fence stripping went with the merge:
  their only sources were AI steps, and `/api/oauth/resume` returns JSON.
- **Renamed to JSON Resume Connect** (2026-10-27). Google's add-on naming rules forbid "Google" in
  the name. The DCR `client_name` is now the same name. A client registered before the rename
  keeps its old name on jsonresume.org's consent screen until it is registered again.
- **Parse Job Description and Apply Tailoring were removed** (2026-10-27). Tailoring lives in
  another tool.

## Why the tests did not catch any of this

They asserted the same wrong shape the code used. Green, self-consistent, and proving nothing
about the platform. **A test that agrees with the code about the wrong thing is worse than no
test.** They now assert the `actionInvocation` payload and carry two regression guards: the old
`formInputs` shape must be *rejected*, and an integer input must not masquerade as a string.

## Verified running — 2026-09-30

This is no longer a design that should work. It ran, on Google's servers, in a real flow.

| | |
|---|---|
| `onConfigLoadJsonResume` | 0.711 s · **Completed** |
| `onExecuteLoadJsonResume` | 0.91 s · **Completed** |
| Flow | `Start manually` → `Load JSON Resume` → **Run Completed** |

**The payload that settles it**, logged by `onExecute`'s first statement:

```json
{
  "clientPlatform": "web",
  "commonEventObject": { "platform": "WEB", "hostApp": "WORKFLOW" },
  "workflow": {
    "triggerEventSource": "TRIGGER_EVENT_SOURCE_AUTOMATED",
    "actionInvocation": {
      "triggerId": "…",
      "inputs": { "resumeUrl": { "stringValues": ["https://…/resume.json"] } }
    },
    "executionMetadata": {}
  },
  "hostApp": "flows"
}
```

`commonEventObject` holds **`platform` and `hostApp`, nothing else** — there is no `formInputs`
to fall back on, so the original implementation would have read `undefined` and reported
"no URL is configured" against a field the user could plainly see filled in.

**Two fields no documentation mentions:** `triggerId` on the `actionInvocation`, and `hostApp`
appearing **twice with different values** — `"WORKFLOW"` inside `commonEventObject`, `"flows"`
at the top level.

This exact payload is pinned in `test/helpers.mjs` as `LIVE_EVENT`. If it stops parsing,
the platform changed.

## Also learned in the first deploy

From 2026-09-30, when the step still took a résumé URL:

- **The JSON Resume registry can be wrong about your own résumé.** It returned
  `RESUME_NOT_VALID_JSON` for a gist that parses cleanly and renders fine through this step. A
  gist raw URL is the more reliable source, and is exactly the "any HTTPS URL" case this step
  exists to serve.
