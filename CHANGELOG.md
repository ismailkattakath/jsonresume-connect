# Changelog

All notable changes to this project are documented in this file.

It follows the principles of [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) (newest
first, one section per release, human-readable), and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Entries are written by [release-please](https://github.com/googleapis/release-please) from
[Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/). Do not edit them by
hand; each release is inserted directly below this paragraph, newest first.

## [0.1.1](https://github.com/ismailkattakath/jsonresume-connect/compare/v0.1.0...v0.1.1) (2026-10-28)


### Features

* name and email for later steps change the outputs only, never the Doc ([6d4f754](https://github.com/ismailkattakath/jsonresume-connect/commit/6d4f754e7c3abee735abd8723fe73090a374a47c))
* optional Name, Email address and Photo URL overrides on the step card ([d78e6f1](https://github.com/ismailkattakath/jsonresume-connect/commit/d78e6f1698b0014fe524e872070e22f4029c8035))


### Bug Fixes

* **step:** a resume without a valid email fails clearly instead of breaking the run ([30a7394](https://github.com/ismailkattakath/jsonresume-connect/commit/30a7394f26e3070bd03c7b9af28a2647947b993b))
* validate dates with the @jsonresume/schema 1.7.0 iso8601 pattern ([89f2005](https://github.com/ismailkattakath/jsonresume-connect/commit/89f200528ac393bdbdddb7e392a51b48a1441877))


### Reverts

* drop the step's override fields; the card keeps only Document title ([05663cb](https://github.com/ismailkattakath/jsonresume-connect/commit/05663cbcd598c93a9afbdce059d22d13763c700b))


### Miscellaneous Chores

* release 0.1.1 ([d0be085](https://github.com/ismailkattakath/jsonresume-connect/commit/d0be08535ff4849173cab249f5754aecfb9fcd93))

## 0.1.0 (2026-10-27)


### ⚠ BREAKING CHANGES

* the add-on and step display name is now JSON Resume Connect, and the default Doc title ends in "— Resume".
* the step id is now jsonResumeToDoc. Flows using Load JSON Resume or Render JSON Resume to Doc must re-add the step.
* flows that use Parse Job Description or Apply Tailoring lose those steps.

### Features

* **addon:** academic-cv-lite look for the Doc; step renamed "Render JSON Resume to Doc" ([4e7d525](https://github.com/ismailkattakath/jsonresume-connect/commit/4e7d525379d709b3162b240bf0b1817c8f95e3c8))
* **addon:** it runs — replace every inference with the observed event payload ([8514a31](https://github.com/ismailkattakath/jsonresume-connect/commit/8514a312d20a3edd68cc8043f922af7ebac11fc0))
* **addon:** Load JSON Resume — a Workspace Studio step anyone can point at their own resume ([8a960ce](https://github.com/ismailkattakath/jsonresume-connect/commit/8a960ce913f65b8f1284b4d2299902b4d14a55e0))
* **addon:** Load JSON Resume reads the signed-in jsonresume.org account only ([2565d6d](https://github.com/ismailkattakath/jsonresume-connect/commit/2565d6d41ff921ae8c8d1d42eb00d55821370b30))
* **addon:** Render Resume to Doc — JSON Resume to a Google Doc and PDF ([3a5acb1](https://github.com/ismailkattakath/jsonresume-connect/commit/3a5acb10cc36c832b5ee461d6052ddf2ab3298c4))
* **addon:** the Doc is the single artifact; PDF and DOCX as export links ([d76fe1e](https://github.com/ismailkattakath/jsonresume-connect/commit/d76fe1ec6909dc60f872199e74f99dbae49f6af0))
* **addon:** validate AI-rewritten input against the jsonresume.org shape ([1ea2e14](https://github.com/ismailkattakath/jsonresume-connect/commit/1ea2e1414f6287279c6bd06d6d5929ddf5a94953))
* **brand:** original braces-on-page logo with Marketplace icon, banner and consent-screen PNGs ([dc22de4](https://github.com/ismailkattakath/jsonresume-connect/commit/dc22de4aae95ee4aa3835549f8eccd7fdff3d791))
* chip labels follow the built-in Create a doc step; add docName ([4dbafc9](https://github.com/ismailkattakath/jsonresume-connect/commit/4dbafc9d97dbe8479c03afb42414c603f240f33f))
* merge Load JSON Resume and Render JSON Resume to Doc into one step ([de4315a](https://github.com/ismailkattakath/jsonresume-connect/commit/de4315a67612afaed79db8c074c9927392699451))
* rename to JSON Resume Connect; apply the card-UX design review ([5044b6f](https://github.com/ismailkattakath/jsonresume-connect/commit/5044b6f957a305adb485b76f41d952c42c630c69))
* **step:** email output is EMAIL_ADDRESS, so a draft can send to it ([a618400](https://github.com/ismailkattakath/jsonresume-connect/commit/a618400c50dd9c82e0382ff6596325830d5382c6))


### Bug Fixes

* **addon:** 0.5 in page margins bring the résumé to 3 pages ([692d83d](https://github.com/ismailkattakath/jsonresume-connect/commit/692d83d852a8e7bdbbb4c566df2dfa8515072104))
* **addon:** bold "refresh" instead of a link on the connect card ([11d1abf](https://github.com/ismailkattakath/jsonresume-connect/commit/11d1abff0440c128b14f2d43cd40008cd674f654))
* **addon:** eight findings from the renderer's first live run ([ed5ed06](https://github.com/ismailkattakath/jsonresume-connect/commit/ed5ed063e54c3c9d44e2b3c14840ddeeb5c397c8))
* **addon:** tell the user to refresh the page after connecting, not reopen the step ([230926f](https://github.com/ismailkattakath/jsonresume-connect/commit/230926fe3bc65d44b8252188efe76392aae025b7))
* **addon:** the step could never have worked — three deploy-blocking bugs ([16bbe40](https://github.com/ismailkattakath/jsonresume-connect/commit/16bbe40b02701c38c591b0fa03567827e9fd3864))
* **addon:** updateNamedStyle needs namedStyleType in its fields mask ([0571c9f](https://github.com/ismailkattakath/jsonresume-connect/commit/0571c9f829d973aef7feaf2c8adedcb9dca5e8a7))
* **addon:** whole-point font sizes and tighter spacing after the second live run ([880cb4d](https://github.com/ismailkattakath/jsonresume-connect/commit/880cb4dedd1a206c3efffce4473b284c2e25fe71))
* **assets:** match the Docs icon's fold, corner radius and bottom glow ([934cee3](https://github.com/ismailkattakath/jsonresume-connect/commit/934cee39ec0efae6a075847ad6df0a35a718298f))
* **assets:** shrink the braces to the Docs glyph bottom margin ([66da77f](https://github.com/ismailkattakath/jsonresume-connect/commit/66da77fd9b33df780f4f74737ec7ee0d71fedb5d))
* **assets:** size the icon on the Google Workspace product-icon grid ([58ecc75](https://github.com/ismailkattakath/jsonresume-connect/commit/58ecc75d795a15e689165d59529eba34a6beb4e0))
* exact design-review wording for retryable errors; link jsonresume.org ([d4bb9b2](https://github.com/ismailkattakath/jsonresume-connect/commit/d4bb9b24d65e2b522c5b3eabbba5d369f4d30725))
* **manifest:** pin logoUrl to a commit so caches can't serve the old icon ([4f02f6f](https://github.com/ismailkattakath/jsonresume-connect/commit/4f02f6fa827a96a757b50ebfe327347153902a02))
* **step:** label the email output "Resume", shown as "Resume email address" ([0cc0581](https://github.com/ismailkattakath/jsonresume-connect/commit/0cc0581c28d415012a427e1e5acb3ce64330cbd9))


### Code Refactoring

* remove the Parse Job Description and Apply Tailoring steps ([7de2f6c](https://github.com/ismailkattakath/jsonresume-connect/commit/7de2f6c96260a28708812d3f0d037def5f6b435d))

## [Pre-release]

Work before the first tagged release is recorded in the git history.
