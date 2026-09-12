/**
 * Escalation policy (human-readable source of truth, mirrored in code).
 * A message escalates to a human when ANY signal fires. Signals are intentionally
 * recall-oriented for safety/money/lockout: a false escalation costs a review,
 * a missed one costs a customer.
 */
export const ESCALATION_POLICY = `# Escalation policy v1
ESCALATE when ANY is true (standalone customer message):
1. SAFETY — swelling/split battery, shock, burn, heat injury, physical harm, threat.
2. LOCKOUT — locked out of Apple ID/device, cannot sign in, repeated password/2FA failure.
3. DATA_LOSS — data, photos, messages, notes, or purchases gone/deleted/lost.
4. MONEY — wrong charge, refund demand, billing dispute, failed purchase/order.
5. UNUSABLE — device explicitly unusable (cannot use at all, black screen, reboot loop,
   30-minute battery, cannot make calls, no SIM/service).
6. REPEATED_FAILURE — prior contacts, hours on hold, supervisor never called, second defective
   device, service center/case unresolved, month-long issue.
7. LOW_CONFIDENCE_HIGH_STAKES — classifier confidence < 0.5 AND (money/account/safety words).
Do NOT escalate for: single complaints (however angry), how-to questions, feature requests,
vague rants with no actionable failure.
`;
