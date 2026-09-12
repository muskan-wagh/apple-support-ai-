# Intent Taxonomy — Apple Support (TWCS), Phase 2 FROZEN

Source of truth for code: `src/intents/taxonomy.ts` (`INTENT_DEFS`, `KEYWORD_RULES`,
`INTENT_PRIORITY`, `assignIntent`/`matchIntents`).
Counts: `npm run intents:count` over all 98,576 verified conversations (customer messages only).

## How it was built (no invented categories)

1. Read 40 seeded-random customer messages + top-120 term frequencies
   (dominated by iOS 11-era traffic: update, ios, battery, fix, screen, wifi, music, icloud …).
2. Drafted need-based candidates, then probed each with regex groups + read samples
   (account, billing, battery, update, connectivity, hardware, apps, backup, howto,
   performance, autocorrect/keyboard, storage, unlock, Apple Pay, watch/mac-as-device).
3. Merged what the data wouldn't separate (autocorrect/keyboard + slow/freeze/crash →
   `software_quality`; storage → `device_hardware`; unlock/biometrics → `account_login`;
   Apple Pay/Wallet → `purchase_billing`; alarm/clock → `apps_services`;
   watch/mac/ipad stay device attributes, not intents).
4. Tightened noisy rules against real counter-examples found while reading
   (`$700`-rants are not billing; `did` must not match battery `dies`;
   `Verifying update` is not a login problem; `power button` is hardware;
   keyboard spacebar is not storage).
5. Self-check: all 33 verbatim taxonomy examples match their own intent
   (`npm run intents:count` → `example self-check: 0 failures`).

## The 11 intents (priority order for single-label assignment)

### 1. account_login — 2,688 (2.73%)
Definition: cannot access an Apple account or device (Apple ID, password, sign-in,
verification/2FA, locked out, device unlock incl. passcode/Touch/Face ID).
Includes: Apple ID · password · log in/sign in · verification/2FA · unlock/biometrics.
Boundary: update-time "Verifying update" → software_update; app-specific logins → apps_services.
Examples:
- "@AppleSupport Hello, I need some help regarding the region change on my Apple ID"
- "@AppleSupport who's bright fucking idea was it to make the process for 'forgot password' to enter the password I forgot. Are you stupid???"
- "@AppleSupport my phone is broken and i need to log into my iCloud, but it says I need to verify on my phone, WHICH IS BROKEN. what do?"

### 2. purchase_billing — 2,560 (2.60%)
Definition: money movement and commercial transactions (purchases, orders, billing charges,
payments, subscriptions, refunds, gift cards, Apple Pay/Wallet).
Includes: refund · purchase/order · billing/charged-card · subscription/payment · gift card/Apple Pay.
Boundary: price rants without a transaction ("$700 phone sucks") are other; battery charging is battery_power.
Examples:
- "@AppleSupport hi, if I should purchase a song from itunes with an active apple music subscription would i be debited"
- "@AppleSupport I received an Apple Gift card and Wallet will not allow a scan or manual add even the card states it can be added to ApplePay?"
- "@AppleSupport, wow - Apple app sent me to store to enroll, Apple store sent me away. Didn't expect a phone, did expect to order :-/"

### 3. backup_sync — 1,528 (1.55%)
Definition: getting data onto/off/between devices (backups, restores, sync, transfers,
migration, setup-from-backup).
Includes: backup · restore · sync · transfer/migrate.
Boundary: storage-full without backup context → device_hardware; update-download failure → software_update.
Examples:
- "Just updated iOS on iPhone7, now iCloud backup greyed out, cannot be turned on, says “Last Backup Never”"
- "LIKE WHAT THE FAAAAAUUUUCCCKKKKKKKKKKKKKKKKKKKKKKKK @AppleSupport this back up is taking FOREVER 6+ hours and not even at half!!!!!"
- "@AppleSupport I am trying to set up my X from iCloud backup.. all my apps are saying either loading or waiting but not doing anything. Help?"

### 4. battery_power — 9,719 (9.86%)
Definition: power problems (fast drain, won't charge, dies at a %, overheating, won't power on).
Includes: battery · charge/charger · drain/dies/dead · heats · won't power on.
Boundary: "power button" breakage → device_hardware; billing "charges" → purchase_billing;
post-update drain stays here (symptom beats context).
Examples:
- "the new iOS 11 SUCKS !!! battery lost quickly and heats up my phone"
- "@AppleSupport I have IOS 11.1 and there's no message in settings battery."
- "My shit dies on 30% and restarts when I plug my headphones in"

### 5. connectivity — 4,045 (4.10%)
Definition: getting/staying connected (Wi-Fi, Bluetooth, cellular/signal, hotspot, AirDrop,
dropped calls, voicemail).
Includes: Wi-Fi · Bluetooth · cellular/signal/no-service · calls/voicemail.
Boundary: iMessage/FaceTime app faults → apps_services; music-over-Wi-Fi download faults → apps_services.
Examples:
- "Yo @AppleSupport I keep turning Wi-fi off but it keeps turning itself back on, how do I fix this?"
- "@AppleSupport I want to completely turn off wifi on control panel. Is there any setting?"
- "@AppleSupport why does the Bluetooth turn itself on after I take my phone off airplane mode?"

### 6. device_hardware — 5,373 (5.45%)
Definition: the physical device or its capacity (screen/touch, buttons, camera, speaker/mic,
headphone-mode stuck, cracks, vibration, full storage).
Includes: screen/touch · buttons · camera/speaker/mic · cracked · headphone mode · storage full.
Boundary: keyboard/autocorrect → software_quality; nameless freeze/slowness → software_quality.
Examples:
- "@AppleSupport :( my touch screen stopped working for no reason"
- "@AppleSupport my phone is in headphone mode with no headphones"
- "Still, sucks. My speaker phone doesn't work and my phone freezes non stop."

### 7. software_update — 22,278 (22.60%)
Definition: getting/applying system software (availability, download/install/verify failures,
version questions).
Includes: update/updated · iOS 11 / 11.x versions · install/verify failures · newest/latest software.
Boundary: post-update breakage is labeled by symptom; App Store app updates → apps_services.
Examples:
- "@AppleSupport any idea of a bug fix update for iOS 11 - release date for messages?"
- "Well @115858 has updated IOS11 three times. Finally went ahead and updated. Now iMessage doesn't work. Good job Apple!"
- "@AppleSupport help me.. my iPhone 5s is freezing on homescreen, can't adjust audio, after update to iOS 11.0.3. please fix it asap"

### 8. software_quality — 7,281 (7.39%)
Definition: software misbehaving outside the update process (bugs, autocorrect/keyboard,
crashes, freezes, slowness, boot loops).
Includes: bug/glitch · autocorrect/keyboard · crash/freeze/slow/lag/stuck · Apple-logo boot loop.
Boundary: named-part failures → device_hardware; named Apple apps/services → apps_services.
Examples:
- "@AppleSupport Taking portrait mode photos keeps crashing and restarting my iPhone X. Other modes are fine. Already on iOS 11.1. Help!"
- "I have the 128gb red 7+ that just came out in March. THERE IS NO WAY it should be freezing like this. FIX IT"
- "This glitch is making me look illiterate, sign from God, stop texting and tweeting, pick up the phone and talk. Hmph #FixitJesus"

### 9. apps_services — 3,378 (3.43%)
Definition: Apple apps/services misbehaving (App Store, iCloud, Music, iTunes, Photos sync,
Mail, iMessage, FaceTime, Siri, Safari, alarm).
Includes: App Store · iCloud · Music/iTunes · Photos sync · iMessage/FaceTime/Siri/Mail/Safari/alarm.
Boundary: camera capture → device_hardware; iCloud backup/restore → backup_sync; iCloud login → account_login.
Examples:
- "my music doesn't download onto my phone! I have Apple Music help me and yes I'm using WiFi"
- "@AppleSupport While I'm at it, how do I relocate my iTunes? It's on my desktop computer and to move every song then start a new iTunes just to have it elsewhere is traumatizing to think about!"
- "My TV kept asking me to add iCloud so I did now it keeps asking me to accept the terms and it doesn't allow me to."

### 10. howto_settings — 1,982 (2.01%)
Definition: pure how-to/where-is/settings-navigation questions with no specific failing need.
Includes: how do/can I · where is · turn off/on · settings navigation.
Boundary: LAST priority — any named need wins over question form.
Examples:
- "@AppleSupport In settings > calendar (where do I turn off?)"
- "@AppleSupport Oh hey. How do I get to that?"
- "@AppleSupport how to get pics clicked by iphone on laptop/computr for printing?"

### 11. other — 37,744 (38.29%)
Definition: genuinely unclassifiable standalone (yes/no and fragment follow-ups, media-only
messages, vague rants naming no need). Honest bucket, not a dumping ground.
Includes: fragment follow-ups · link/photo-only · need-free rants.
Boundary: anything matching a need above — even angrily — takes that need
("battery dead" is battery_power). Bare version strings ("11.0.3") count as
software_update (update context), not other.
Examples:
- "@AppleSupport Yes"
- "@AppleSupport https://t.co/NV0yucs0lB"
- "Y'all. What is going on? @115858 fix this"

## Full-corpus counts (weak labels, n = 98,576)

Single-label (priority order) vs multi-label (every rule hit):

| intent | single | single % | multi | multi % |
|---|---|---|---|---|
| account_login | 2,688 | 2.73 | 2,688 | 2.73 |
| purchase_billing | 2,560 | 2.60 | 2,716 | 2.76 |
| backup_sync | 1,528 | 1.55 | 1,648 | 1.67 |
| battery_power | 9,719 | 9.86 | 9,990 | 10.13 |
| connectivity | 4,045 | 4.10 | 4,721 | 4.79 |
| device_hardware | 5,373 | 5.45 | 6,673 | 6.77 |
| software_update | 22,278 | 22.60 | 32,305 | 32.77 |
| software_quality | 7,281 | 7.39 | 16,610 | 16.85 |
| apps_services | 3,378 | 3.43 | 7,325 | 7.43 |
| howto_settings | 1,982 | 2.01 | 5,704 | 5.79 |
| other | 37,744 | 38.29 | 37,744 | 38.29 |

Multi-label messages (2+ intents): 23,855 (24.2%). Imbalance is real and expected:
update chatter dominates the iOS 11 window; account/billing/backup are rare but
escalation-critical (kept separate deliberately — see escalation policy, Phase 6).

## Limitations (read before citing a number)

- Counts are keyword weak labels, NOT human labels. `other` (38.3%) is large because
  Twitter support threads are full of context-dependent follow-ups ("Yes", "11.0.3"),
  media-only messages, and need-free rants — the golden set (Phase 3) will sample
  stratifiably and label by hand instead.
- Single-label assignment hides the 24.2% multi-intent overlap; per-intent recall measured
  against these rules would flatter generic intents and punish rare ones.
- Rules are English-only; ~1% of traffic (e.g. Spanish) is under-counted in need intents.
- Frozen as of this phase's approval; changes after golden labeling go through the
  decision log with before/after counts.
