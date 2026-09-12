/**
 * Intent taxonomy for Apple Support (TWCS) — Phase 2, FROZEN after review.
 *
 * Built from the actual AppleSupport corpus (98,576 conversations, Nov 2017 era,
 * dominated by iOS 11 issues): seeded random reads + term-frequency analysis +
 * targeted probes drove every category. See reports/intent-taxonomy.md for
 * definitions, boundaries, verbatim examples, and real corpus counts.
 *
 * Single-label assignment uses INTENT_PRIORITY (specific need first, generic
 * question-form last). matchIntents() exposes all raw hits for analysis.
 * These keyword rules are a transparent baseline/counting signal — NOT golden
 * truth (human-validated labels land in Phase 3).
 */
export const INTENT_NAMES = [
  "account_login",
  "purchase_billing",
  "backup_sync",
  "battery_power",
  "connectivity",
  "device_hardware",
  "software_update",
  "software_quality",
  "apps_services",
  "howto_settings",
  "other",
] as const;

export type IntentName = (typeof INTENT_NAMES)[number];

export interface IntentDef {
  /** What customer need this intent captures. */
  definition: string;
  /** Representative inclusion signals (mirrors KEYWORD_RULES, human-readable). */
  includes: string[];
  /** Boundary with similar intents: what belongs elsewhere. */
  excludes: string;
  /** Verbatim real customer messages from the corpus (evidence, not invented). */
  examples: string[];
}

export const INTENT_DEFS: Record<IntentName, IntentDef> = {
  account_login: {
    definition:
      "Cannot access an Apple account or device: Apple ID, password, sign-in, " +
      "two-factor/verification, locked out, or device unlock (passcode, Touch/Face ID).",
    includes: ["Apple ID", "password / forgot password", "log in / sign in", "verification / 2FA", "unlock, passcode, Touch/Face ID"],
    excludes:
      "Update-time 'Verifying update' errors go to software_update. " +
      "App-specific logins (e.g. Gmail in Mail) go to apps_services.",
    examples: [
      "@AppleSupport Hello, I need some help regarding the region change on my Apple ID",
      "@AppleSupport who's bright fucking idea was it to make the process for 'forgot password' to enter the password I forgot. Are you stupid???",
      "@AppleSupport my phone is broken and i need to log into my iCloud, but it says I need to verify on my phone, WHICH IS BROKEN. what do?",
    ],
  },
  purchase_billing: {
    definition:
      "Money movement or commercial transactions: purchases, orders, billing charges, " +
      "payments, subscriptions, refunds, gift cards, Apple Pay/Wallet transactions.",
    includes: ["refund", "purchase / order", "billing / charged (card)", "subscription / payment", "gift card, Apple Pay / Wallet"],
    excludes:
      "Price rants without a transaction ('$700 phone sucks') are other, not billing. " +
      "Battery 'charging' belongs to battery_power, never here.",
    examples: [
      "@AppleSupport hi, if I should purchase a song from itunes with an active apple music subscription would i be debited",
      "@AppleSupport I received an Apple Gift card and Wallet will not allow a scan or manual add even the card states it can be added to ApplePay?",
      "@AppleSupport, wow - Apple app sent me to store to enroll, Apple store sent me away. Didn't expect a phone, did expect to order :-/",
    ],
  },
  backup_sync: {
    definition:
      "Getting data onto/off/between devices: iCloud/computer backups, restores, " +
      "sync failures, transfers, migration and new-device setup from backup.",
    includes: ["backup / back up", "restore", "sync", "transfer / migrate", "set up from backup"],
    excludes:
      "Storage-full complaints without backup context go to device_hardware. " +
      "Update-download failures go to software_update.",
    examples: [
      "Just updated iOS on iPhone7, now iCloud backup greyed out, cannot be turned on, says \u201CLast Backup Never\u201D",
      "LIKE WHAT THE FAAAAAUUUUCCCKKKKKKKKKKKKKKKKKKKKKKKK @AppleSupport this back up is taking FOREVER 6+ hours and not even at half!!!!!",
      "@AppleSupport I am trying to set up my X from iCloud backup.. all my apps are saying either loading or waiting but not doing anything. Help?",
    ],
  },
  battery_power: {
    definition:
      "Power problems: fast drain, won't charge, dies at a percentage, overheating, " +
      "or the phone not powering on.",
    includes: ["battery / batteries", "charge / charging / charger", "drain / dies", "heats / overheats", "won't power on"],
    excludes:
      "'Power button' breakage is device_hardware. Billing 'charges' are purchase_billing. " +
      "Post-update drain is still battery_power (symptom beats context).",
    examples: [
      "the new iOS 11 SUCKS !!! battery lost quickly and heats up my phone",
      "@AppleSupport I have IOS 11.1 and there's no message in settings battery.",
      "My shit dies on 30% and restarts when I plug my headphones in",
    ],
  },
  connectivity: {
    definition:
      "Getting or staying connected: Wi-Fi, Bluetooth, cellular/signal/'no service', " +
      "hotspot, AirDrop, dropped/failed calls, voicemail access.",
    includes: ["Wi-Fi on/off/connect", "Bluetooth pairing / randomly on", "cellular, signal, no service, carrier", "calls failing, voicemail"],
    excludes:
      "iMessage/FaceTime app problems go to apps_services even though they need a network. " +
      "Music that won't download over Wi-Fi is apps_services when the app is the subject.",
    examples: [
      "Yo @AppleSupport I keep turning Wi-fi off but it keeps turning itself back on, how do I fix this?",
      "@AppleSupport I want to completely turn off wifi on control panel. Is there any setting?",
      "@AppleSupport why does the Bluetooth turn itself on after I take my phone off airplane mode?",
    ],
  },
  device_hardware: {
    definition:
      "The physical device or its capacity: screen/touch, buttons, camera, " +
      "speaker/microphone, headphone-mode stuck, cracks/damage, vibration, or full storage.",
    includes: ["screen / touch / display", "button (home/power/volume)", "camera, speaker, mic", "cracked / shattered", "headphone mode stuck", "storage full / not enough space"],
    excludes:
      "Keyboard/autocorrect trouble is software_quality (spacebar included). " +
      "Freeze/slow performance without a named part is software_quality.",
    examples: [
      "@AppleSupport :( my touch screen stopped working for no reason",
      "@AppleSupport my phone is in headphone mode with no headphones",
      "Still, sucks. My speaker phone doesn't work and my phone freezes non stop.",
    ],
  },
  software_update: {
    definition:
      "Getting or applying system software: update availability/timing, download or " +
      "install/verify failures, and version questions ('which iOS', '11.0.3').",
    includes: ["update / updating / updated", "iOS 11 / 11.x version mentions", "download/install/verify-update failures", "'newest/latest' software questions"],
    excludes:
      "Post-update breakage is labeled by symptom (battery_power, software_quality, ...). " +
      "App Store app updates belong to apps_services.",
    examples: [
      "@AppleSupport any idea of a bug fix update for iOS 11 - release date for messages?",
      "Well @115858 has updated IOS11 three times. Finally went ahead and updated. Now iMessage doesn't work. Good job Apple!",
      "@AppleSupport help me.. my iPhone 5s is freezing on homescreen, can't adjust audio, after update to iOS 11.0.3. please fix it asap",
    ],
  },
  software_quality: {
    definition:
      "Software misbehaving (not the update process): bugs and glitches, autocorrect/keyboard " +
      "trouble, crashes, freezes, slowness, boot loops, 'stuck on Apple logo'.",
    includes: ["bug / glitch", "autocorrect / keyboard / predictive", "crash / freeze / frozen / slow / lag / stuck", "stuck on Apple logo / boot loop"],
    excludes:
      "Named-part failures (touch screen, speaker) are device_hardware. " +
      "Named Apple apps/services misbehaving are apps_services.",
    examples: [
      "@AppleSupport Taking portrait mode photos keeps crashing and restarting my iPhone X. Other modes are fine. Already on iOS 11.1. Help!",
      "I have the 128gb red 7+ that just came out in March. THERE IS NO WAY it should be freezing like this. FIX IT",
      "This glitch is making me look illiterate, sign from God, stop texting and tweeting, pick up the phone and talk. Hmph #FixitJesus",
    ],
  },
  apps_services: {
    definition:
      "Apple apps and services misbehaving: App Store, iCloud service, Apple Music, iTunes, " +
      "Photos library/sync, Mail, iMessage, FaceTime, Siri, Safari, Clock/alarm.",
    includes: ["App Store (incl. app downloads)", "iCloud service", "Apple Music / iTunes", "Photos sync/library", "iMessage / FaceTime / Siri / Mail / Safari / alarm"],
    excludes:
      "Camera capture problems are device_hardware; Photos sync problems are here. " +
      "iCloud backup/restore is backup_sync; iCloud login is account_login.",
    examples: [
      "my music doesn't download onto my phone! I have Apple Music help me and yes I'm using WiFi",
      "@AppleSupport While I'm at it, how do I relocate my iTunes? It's on my desktop computer and to move every song then start a new iTunes just to have it elsewhere is traumatizing to think about!",
      "My TV kept asking me to add iCloud so I did now it keeps asking me to accept the terms and it doesn't allow me to.",
    ],
  },
  howto_settings: {
    definition:
      "Pure how-to / where-is / settings-navigation questions with no specific failing need: " +
      "'how do I …', 'where is …', 'how do I turn … off'.",
    includes: ["how do/can I …", "where is / where do I …", "turn off/on/up/down", "settings navigation"],
    excludes:
      "Any message naming a need (battery, Wi-Fi, update, …) takes that intent by priority — " +
      "this is the fallback for need-free questions only.",
    examples: [
      "@AppleSupport In settings > calendar (where do I turn off?)",
      "@AppleSupport Oh hey. How do I get to that?",
      "@AppleSupport how to get pics clicked by iphone on laptop/computr for printing?",
    ],
  },
  other: {
    definition:
      "Genuinely unclassifiable standalone: yes/no and fragment follow-ups, " +
      "media-only messages, and vague rants naming no need. Honest bucket, not a dumping ground. " +
      "Note: bare version strings ('11.0.3') count as software_update (update context), not other.",
    includes: ["yes-no / fragment follow-ups", "link/photo-only messages", "rants with no actionable need"],
    excludes:
      "Anything matching a need above — even angrily — belongs to that need. " +
      "Short messages WITH a need word ('battery dead') are battery_power.",
    examples: ["@AppleSupport Yes", "@AppleSupport https://t.co/NV0yucs0lB", "Y'all. What is going on? @115858 fix this"],
  },
};

/** Priority for single-label assignment: specific needs first, question-form last. */
export const INTENT_PRIORITY: readonly IntentName[] = [
  "account_login",
  "purchase_billing",
  "backup_sync",
  "battery_power",
  "connectivity",
  "device_hardware",
  "software_update",
  "software_quality",
  "apps_services",
  "howto_settings",
  "other",
];

const R = (src: string): RegExp => new RegExp(src, "i");

/** Transparent counting/matching rules. Auditable; also the Phase 9 keyword baseline. */
export const KEYWORD_RULES: Record<Exclude<IntentName, "other">, RegExp[]> = {
  account_login: [
    R(`apple\\s?id`),
    R(`passw`),
    R(`\\blog\\s?in\\b`),
    R(`\\bsign\\s?in\\b`),
    // "Verifying update" is an update-process message, not a login problem.
    R(`verif(?![a-z]*\\s+update)`),
    R(`two.?factor|\\b2fa\\b`),
    R(`locked\\sout`),
    R(`touch\\s?id|face\\s?id|passcode`),
    R(`\\bunlock\\b`),
  ],
  purchase_billing: [
    R(`\\brefund\\b`),
    R(`\\bpurchase[sd]?\\b`),
    R(`\\border(s|ed|ing)?\\b`),
    R(`\\bbill(ing|ed|s)?\\b`),
    R(`\\bpayment\\b`),
    R(`\\bsubscri`),
    R(`gift\\s?card`),
    R(`apple\\s?pay|\\bwallet\\b`),
    R(`\\bdebit(ed)?\\b|\\binvoice\\b|\\breceipt\\b`),
  ],
  backup_sync: [
    R(`back.?up`),
    R(`\\brestor`),
    R(`\\bsync\\b`),
    R(`\\btransfer\\b`),
    R(`\\bmigrat`),
  ],
  battery_power: [
    R(`\\bbatter(y|ies)\\b`),
    R(`\\bcharg(e|ing|er|es)\\b`),
    // "power button" is a hardware part, not a power problem.
    R(`\\bpower(?!\\s*button)\\b`),
    R(`\\bdrain`),
    R(`\\bdies?\\b|\\bdead\\b`),
    R(`\\bheats?\\b|overheat`),
    R(`\\bpercent`),
  ],
  connectivity: [
    R(`\\bwifi\\b|wi.?fi`),
    R(`\\bbluetooth\\b`),
    R(`\\bcellular\\b`),
    R(`\\bsignal\\b`),
    R(`\\bhotspot\\b`),
    R(`\\bairdrop\\b`),
    R(`no\\sservice`),
    R(`\\bcarrier\\b`),
    // bare "data" = cellular data, unless it is data-loss/erase/recovery talk.
    R(`\\bdata\\b(?!\\s*(loss|eras|recover|restor|backup))`),
    R(`call\\s(keeps\\s)?(drop|fail|cut)|drop.*call|can.?t.*(call|text)`),
    R(`\\bvoicemail\\b`),
  ],
  device_hardware: [
    R(`\\bscreen\\b`),
    R(`\\btouch\\b`),
    R(`\\bbutton\\b`),
    R(`\\bcamera\\b|\\blens\\b`),
    R(`\\bspeaker\\b`),
    R(`\\bmicrophone\\b|\\bmic\\b`),
    R(`\\bcrack|shatter`),
    R(`\\bdisplay\\b`),
    R(`headphone\\smode`),
    R(`\\bvibrat`),
    R(`not\\senough\\sspace|out\\sof\\s(space|storage)|storage\\s(full|almost)|free\\sup\\sspace|memory.*full|full.*memory`),
  ],
  software_update: [
    R(`\\bupdat(e|ed|ing|s)\\b`),
    R(`\\bios\\s?1[01]\\b`),
    R(`\\b1[01]\\.\\d(\\.\\d)?\\b`),
    R(`\\bnewest\\b`),
    R(`\\blatest\\s+(update|ios|software)`),
    R(`\\bsoftware\\b`),
  ],
  software_quality: [
    R(`autocorrect|predictive`),
    R(`\\bkeyboard\\b`),
    R(`\\bemoji\\b`),
    R(`\\bglitch`),
    R(`\\bbug(?!\\sfix\\supdate)`),
    R(`\\bcrash`),
    R(`\\bfreez|\\bfrozen\\b`),
    R(`\\bslow\\b`),
    R(`\\blag\\b`),
    R(`\\bstuck\\b`),
    R(`\\bhang(s|ing)?\\b`),
    R(`\\brestart(ing|s\\b)`),
    R(`stuck\\son\\sapple\\slogo|boot.?loop|\\bbrick(ed)?\\b`),
  ],
  apps_services: [
    R(`app\\s?store`),
    R(`\\bicloud\\b`),
    R(`apple\\smusic|music\\sapp|\\bitunes\\b`),
    R(`photos?\\s(wont|not|missing|gone|disappear|sync|upload|download|backup|library)|icloud\\sphoto|my\\sphotos?\\s(wont|not|missing|can)`),
    R(`\\bimessage\\b|\\bfacetime\\b|\\bsiri\\b`),
    R(`\\balarm\\b|clock\\sapp`),
    R(`\\bsafari\\b`),
    R(`mail\\sapp|apple\\smail`),
    R(`\\bapp\\s(wont|not|keeps|doesn|cant|crash)`),
  ],
  howto_settings: [
    R(`how\\s(do|can|to)\\b`),
    R(`how'?s`),
    R(`where\\s(do|is|can|to)\\b`),
    R(`turn\\s(off|on|up|down)`),
    R(`\\bsettings?\\b`),
  ],
};

function normalizeMentionUrl(text: string): string {
  return text.toLowerCase().replace(/@\w+/g, " ").replace(/https?:\/\/\S+/g, " ");
}

/** All intents whose rules hit (multi-label view, priority order). Empty => ["other"]. */
export function matchIntents(message: string): IntentName[] {
  const text = normalizeMentionUrl(message);
  const hits: IntentName[] = [];
  for (const name of INTENT_PRIORITY) {
    if (name === "other") continue;
    const rules = KEYWORD_RULES[name];
    if (rules.some((rx) => rx.test(text))) hits.push(name);
  }
  return hits.length > 0 ? hits : ["other"];
}

/** Single-label assignment: first priority hit (or "other"). */
export function assignIntent(message: string): IntentName {
  return matchIntents(message)[0];
}
