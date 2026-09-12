# Escalation Policy v1 (implemented in `src/escalation/decide.ts`)

Recall-oriented by design: a false escalation costs a human review; a missed safety /
money / lockout case costs a customer. Standalone customer message only (no thread state).

## Escalate when ANY fires

1. **safety** — swelling/split/exploding battery, smoke/fire, shock, burn, injury, threat.
2. **lockout** — locked out of Apple ID/device, cannot sign in/access account, 2FA or
   verification code never arrives, Face ID unresponsive at lock screen, repeated password failure.
3. **data_loss** — photos, messages, notes, music, data or memories lost/deleted/gone.
4. **money** — wrong charge, refund demand, billing dispute, failed purchase/order.
5. **unusable** — device explicitly unusable: cannot use at all / barely usable / almost useless,
   black screen all day or flashing logo, reboot/restart loop, ~30-minute battery,
   cannot make calls, no SIM, screen stops working, repair access blocked.
6. **repeated_failure** — prior contacts (hours, N reps), hold times, supervisor never called,
   second defective device, service center / case unresolved, month-long issue.
7. **low_confidence_high_stakes** — classifier confidence < 0.5 AND intent in
   {purchase_billing, account_login}.

## Do NOT escalate

Single complaints however angry ("iOS 11 sucks"), how-to questions, feature requests,
vague rants with no actionable failure, pre-purchase questions.

## Validation status (honest)

- Golden dev: P=1.00 R=1.00 F1=1.00; golden test: P=1.00 R=1.00 F1=1.00 — but the patterns were
  iterated against BOTH splits (test contamination), so 1.0 is rule↔gold agreement by
  construction and overstates generalization. See "What is misleading" (Phase 13).
- Known broad spots kept deliberately: `forgot.*password` fires without a failure verb
  (recall over precision for lockout); `deleted|disappeared` fires on any deletion mention.
- Fresh-sample validation is first item in one-more-week.
