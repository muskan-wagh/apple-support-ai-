# Labeling Guide — Apple Support Golden Set (Phase 3)

Single annotator (AI-assisted human review, 2026-09-12). No second annotator exists, so **no
Cohen's kappa / agreement score is reported or fabricated**. Weak-rule vs golden agreement
(computed by `scripts/finalizeGolden.ts`) is reported as a diagnostic of the keyword rules,
NOT as inter-annotator agreement. A second independent pass is listed in one-more-week.

## Source

- Pool: `data/processed/conversations.jsonl` (98,576 verified Apple pairs).
- Sample: stratified by weak label (`assignIntent`), seed 42, quotas oversampling rare intents
  (16/16/12/22/16/16/28/20/16/12/26 = 200), split 100 dev / 100 test stratified.
- Candidates: `data/golden/candidates-{dev,test}.jsonl` (with `weakIntent`, never shipped as truth).
- Final: `data/golden/golden-{dev,test}.jsonl` after reading every message. Dropped: none (all 200
  had non-empty texts; fragments kept as `other` by rule below).

## Intent — single label, standalone message only

Read ONLY `customerMessage` (no thread context, no support reply). Apply taxonomy
(`src/intents/taxonomy.ts`, `reports/intent-taxonomy.md`) with this precedence:

1. Named need beats question form (`howto_settings` is last resort for need-free questions).
2. Post-update breakage is labeled by SYMPTOM (battery drain → `battery_power`, freeze/crash →
   `software_quality`, no-SIM → `connectivity`), not `software_update`.
3. Named Apple apps/services faults → `apps_services` (iMessage, FaceTime, Siri, Music, App Store,
   iCloud service, Safari, alarm). Camera CAPTURE → `device_hardware`; Photos sync → `apps_services`.
4. iCloud/computer backup, restore, sync, transfer, migrate, setup-from-backup → `backup_sync`.
5. Apple ID / password / sign-in / 2FA / verification (non-update) / device unlock / Face-Touch ID /
   passcode → `account_login`. Update-time "Verifying update" → `software_update`.
6. Money movement (purchase, order, billing, charge, payment, subscription, refund, gift card,
   Apple Pay/Wallet) → `purchase_billing`. Price rants without a transaction → `other`.
7. Wi-Fi / Bluetooth / cellular / signal / no-service / carrier / hotspot / AirDrop / AirPlay /
   calls failing / voicemail → `connectivity`. Music-over-Wi-Fi app faults stay `apps_services`.
8. Screen / touch / button / camera / speaker / mic / crack / headphone-mode-stuck / vibration /
   storage-full → `device_hardware`. Keyboard/autocorrect → `software_quality`.
9. Bare version strings ("11.0.3", "ios 11.1.2") with no other need → `software_update`.
10. Keyboard / autocorrect / bug / glitch / crash / freeze / slow / lag / stuck / boot-loop /
    Apple-logo-stuck → `software_quality`.
11. Yes/no answers, "see last tweet" + link, media-only, need-free rants, drive-by jokes →
    `other`. Non-English with a clear need word (e.g. teclado/keyboard) takes that need;
    otherwise `other`.
12. Two genuine needs → pick the customer's ASK (first-listed failure on ties), record the other
    in `notes` as `multi:<intent>`.

## Escalation — `needsEscalation` boolean (draft policy, also used in Phase 6)

`true` if ANY holds (standalone message):
- SAFETY: swelling/split battery, shock/burn/heat-injury, physical harm.
- LOCKOUT/DATA/MONEY: locked out of account/device, data or content loss, wrong charge / refund
  demand / subscription-billing dispute, failed purchase/order.
- UNUSABLE: phone/device explicitly unusable ("can't use at ALL", "barely useable", black screen
  all day, reboot every minutes, 30-min battery, can't make calls, no SIM).
- REPEATED FAILURE: mentions prior contacts, hours on hold, supervisor never called, second
  defective device, service center not resolving, month-long unresolved issue.
Otherwise `false` (single complaint, however angry, stays `false`).

## Edge cases hit during validation (all 200 read)

- The iOS 11 "I️ → ?/box" autocorrect bug → `software_quality` (was weak `other` 5×).
- "Shut off / turns off randomly" with no battery word → `battery_power` (weak missed).
- "File system verify failed" (Mac disk) → `software_quality`, never `account_login` ("verify" rule).
- "Out of order" (messages) trips the purchase `\border\b` rule → actually `apps_services`.
- "Turning it off in settings" / bare "Thank you" / link-only → `other`.
- Apple-ID-region change → `account_login` (taxonomy example), not `howto_settings`.
- "Where cancel auto renew" → `purchase_billing` (subscription), not `howto_settings`.
