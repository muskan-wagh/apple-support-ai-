/**
 * Golden finalizer — Phase 3.
 * Joins stratified candidates with human-validated labels (reviewed 2026-09-12, all 200 read
 * standalone per reports/labeling-guide.md) and writes data/golden/golden-{dev,test}.jsonl.
 * Prints REAL weak-vs-golden agreement (keyword-rule diagnostic, NOT inter-annotator agreement).
 * Usage: npx tsx scripts/finalizeGolden.ts
 */
import fs from "node:fs";
import path from "node:path";
import type { IntentName } from "../src/intents/taxonomy.js";

const DIR = path.resolve("data/golden");
// [intent, needsEscalation, note?]
type L = [IntentName, boolean, string?];

const DEV: Record<string, L> = {
  "776128->776126": ["software_quality", false],
  "1970785->1970783": ["battery_power", true, "shut off 2x, brand new; weak missed (no battery word)"],
  "1782881->1782879": ["software_quality", false],
  "2293071->2293068": ["software_quality", false, "security/bug report"],
  "441534->441536": ["backup_sync", false],
  "387587->387585": ["connectivity", false],
  "2301722->2301724": ["apps_services", false],
  "1660400->1660399": ["software_quality", false, "weak other; I-autocorrect bug"],
  "2297829->2297827": ["apps_services", false],
  "2852266->2852264": ["other", false, "churn threat, no named need"],
  "1300686->1918380": ["connectivity", false, "multi:update; ask is bluetooth"],
  "1726583->1726581": ["software_quality", false],
  "2229333->2229332": ["software_quality", false, "weak account_login via 'verify'; Mac fsck failure"],
  "125783->125781": ["other", false, "fragment + link"],
  "2894762->2894761": ["software_update", false, "weak backup_sync via 'restore'; ask is downgrade"],
  "1013080->1013079": ["battery_power", false, "weak device_hardware; ask is which chargers work"],
  "523009->523008": ["account_login", false, "multi:restart; password prompt first"],
  "697541->697540": ["battery_power", false],
  "751749->751750": ["software_update", false, "bare version fragment"],
  "331378->331379": ["battery_power", false, "follow-up confirming charging"],
  "1998258->1998257": ["apps_services", false],
  "2321180->2321179": ["account_login", false],
  "2042676->2042675": ["battery_power", false],
  "1181840->1181839": ["software_quality", false, "weak device_hardware via 'button'; keyboard-layout complaint"],
  "1030437->1030438": ["other", false, "weak howto; thread status follow-up, no standalone need"],
  "718766->718765": ["battery_power", false],
  "1986844->1986843": ["software_update", false, "weak other; feature removed by update"],
  "802447->802446": ["device_hardware", false, "weak apps_services; storage-full rule"],
  "358894->358893": ["battery_power", false, "multi:quality; battery first by priority"],
  "2253420->2253418": ["apps_services", false],
  "2440820->2440819": ["purchase_billing", true, "wrong charge + refund"],
  "2580557->2616544": ["software_quality", false, "weak device_hardware via 'screen'; contact-search bug"],
  "2112838->2112837": ["battery_power", false],
  "1662249->1829464": ["software_quality", false, "weak other; slow/crash/lag/rotation"],
  "215391->215390": ["software_update", false, "rant with iOS mention, no symptom"],
  "2499287->2499286": ["connectivity", false, "weak account_login via 'password'; ask is network drops"],
  "1770351->1770350": ["connectivity", false, "bluetooth feature request"],
  "2297818->2297817": ["software_quality", false],
  "1416487->1416486": ["software_quality", false, "weak software_update; post-update ?-boxes = symptom"],
  "665744->665741": ["account_login", true, "weak purchase_billing; 2FA blocks purchase + lockout"],
  "1929203->1929202": ["battery_power", false],
  "1196161->1196160": ["software_update", false],
  "2709124->2709123": ["battery_power", false, "airpods charging+pairing; battery first"],
  "514783->514782": ["software_quality", false],
  "752452->752451": ["connectivity", false],
  "2739469->2739468": ["purchase_billing", false, "subscription coverage question"],
  "1910843->1910842": ["purchase_billing", false, "weak other; pay-extra-for-service question"],
  "2801476->2801474": ["software_quality", false, "weak account_login via Touch ID; ask is freezes"],
  "156001->156002": ["other", false, "fragment"],
  "1988809->1988808": ["software_update", false],
  "1395694->1395693": ["account_login", false, "ask-to-buy password question"],
  "1914966->1914965": ["connectivity", false, "cellular watch"],
  "1784893->1784892": ["apps_services", false, "weak device_hardware via 'button'; Maps howto"],
  "550789->550787": ["purchase_billing", false],
  "1008527->1008525": ["purchase_billing", true, "charged after cancel"],
  "332464->332463": ["battery_power", false, "multi:signal+apps; battery first"],
  "1712027->1712025": ["software_quality", false, "weak other; I-bug question marks"],
  "854541->854540": ["software_update", false, "bare version"],
  "2820440->2820439": ["battery_power", true, "'unusable now' + heat/drain"],
  "1450129->1450128": ["software_quality", false, "weak software_update; post-update glitches = symptom"],
  "2039979->2039978": ["apps_services", false, "Safari named-app fault"],
  "825128->825127": ["backup_sync", false, "SSD transfer question"],
  "666280->666279": ["software_quality", false, "weak other; I-bug"],
  "152803->152802": ["other", true, "weak software_quality via 'hang up'; support-process complaint + 25min holds x3"],
  "2111329->2111330": ["software_quality", false, "weak other; game app stuck"],
  "1785712->1785711": ["software_quality", false, "weak howto; third-party app spinning"],
  "245160->245158": ["software_quality", false, "weak device_hardware via 'screen'; screen-record feature failure"],
  "2652565->2652564": ["other", false, "fragment"],
  "829144->829142": ["software_quality", false, "weak device_hardware; orientation bug"],
  "452619->452618": ["apps_services", false, "iCloud service status"],
  "2133601->2133599": ["apps_services", false, "weak software_update via 'update'; Siri understanding failure"],
  "1718426->1718425": ["connectivity", false, "cellular/carrier compatibility question"],
  "2696004->2696006": ["software_update", false, "version fragment"],
  "549624->549623": ["purchase_billing", false],
  "1467747->1467746": ["software_quality", false],
  "1391231->1391233": ["software_quality", false, "weak software_update; post-update slow/lag = symptom"],
  "2862178->2862180": ["backup_sync", false],
  "778297->778299": ["howto_settings", false, "need-free how-to question"],
  "2850842->2850841": ["apps_services", false, "weak connectivity; Safari website loop"],
  "1881535->1881534": ["apps_services", false, "weak software_update; App Store downloads"],
  "2953797->2953795": ["software_update", false, "weak howto; downgrade question"],
  "873869->873868": ["device_hardware", true, "second defective device, multi-failure"],
  "1622340->1622342": ["other", false, "weak howto; status fragment"],
  "1217613->1217612": ["account_login", false],
  "2754789->2754788": ["purchase_billing", false, "weak howto via 'where'; HomePod presale/order question"],
  "63209->63211": ["software_quality", false],
  "644155->644153": ["purchase_billing", false, "buy/pre-order question"],
  "846967->846966": ["backup_sync", true, "restore took 5h, still broken"],
  "1948722->1948721": ["apps_services", false],
  "1626191->1626189": ["apps_services", false, "weak device_hardware via 'camera'; Photos playback buffering"],
  "1736065->1736064": ["software_quality", false],
  "154412->154410": ["apps_services", false, "weak backup_sync via 'restore'; App Store function change"],
  "336227->336229": ["other", false, "thanks only"],
  "1866276->1866275": ["battery_power", true, "30-min charge, airplane mode"],
  "550846->550845": ["software_quality", false, "weak other; PT keyboard/autocorrect complaint"],
  "2817195->2817194": ["account_login", true, "weak purchase_billing; cannot log in + 3.5h/4 reps, supervisor no-call"],
  "1754195->1754194": ["account_login", true, "lock screen/unlock unresponsive"],
  "543639->543638": ["software_quality", true, "weak software_update; reboot loop every 3-4 min"],
  "2734129->2734128": ["software_quality", false, "weak software_update; ES app crashes + camera fails"],
  "557852->557850": ["connectivity", false, "bluetooth state question"],
};

const TEST: Record<string, L> = {
  "460863->460862": ["apps_services", false, "Siri misunderstanding"],
  "1441539->1441538": ["connectivity", false, "weak other; AirPlay to AppleTV fails"],
  "390466->390465": ["software_quality", false, "weak other; landscape/portrait orientation bug"],
  "2302093->2302092": ["other", false, "vague + link"],
  "2297046->2297045": ["device_hardware", false, "storage full"],
  "399951->399950": ["account_login", false, "password change broke Music login"],
  "2691836->2691838": ["software_update", false, "bare version"],
  "2278482->2278484": ["other", false, "link only"],
  "53594->53591": ["account_login", false],
  "2875100->2875099": ["connectivity", false, "bluetooth disconnects"],
  "114512->114510": ["backup_sync", false, "restore bookmarks + slow; restore is the ask"],
  "2068552->2068551": ["software_quality", true, "weak device_hardware; black screen + flashing logo boot loop"],
  "560482->560481": ["purchase_billing", false],
  "1925550->1925549": ["battery_power", false],
  "2436900->2436899": ["software_quality", true, "crashes, 'almost useless', churn to android"],
  "1337283->1337281": ["purchase_billing", true, "order invalid, still waiting"],
  "1849336->1849335": ["software_quality", false, "weak software_update; screenshot feedback missing = symptom"],
  "1828689->1828688": ["software_quality", false, "weak device_hardware; Files-app auth language bug"],
  "2238949->2238948": ["account_login", true, "locked out, security questions"],
  "1625241->1625240": ["connectivity", true, "weak software_update; no-SIM post-update = symptom"],
  "337464->337463": ["backup_sync", true, "failed update + restore + 'expensive brick'"],
  "486146->486145": ["battery_power", true, "swollen splitting battery SAFETY"],
  "1095148->1095146": ["device_hardware", true, "black screen + no store availability"],
  "919124->919123": ["software_update", false, "rant, no symptom"],
  "2676052->2676054": ["battery_power", true, "weak connectivity; turns off + signal + calls + screen; power first"],
  "2517031->2517030": ["connectivity", true, "cannot make/receive calls"],
  "764906->764905": ["backup_sync", true, "weak howto; MacBook dead + back-up-before-repair ask"],
  "199338->199337": ["device_hardware", true, "weak other; earbuds shocking ears SAFETY"],
  "2003207->2003206": ["software_quality", false],
  "2057773->2057772": ["software_quality", true, "weak software_update; 20+ self-restarts"],
  "1710655->1710657": ["backup_sync", true, "restore caused data loss"],
  "542346->542345": ["apps_services", false],
  "2756796->2756795": ["battery_power", false, "USB-C wattage question"],
  "1746857->1752330": ["software_update", false, "version fragment"],
  "1616675->1616677": ["software_update", false, "landscape software feature request"],
  "1866369->1866368": ["other", false, "weak apps_services; settings screenshot follow-up, no need"],
  "2500939->2500938": ["account_login", false, "weak howto; Apple-ID region change per taxonomy example"],
  "2207509->2207508": ["howto_settings", false, "MMS enable toggle failure in settings"],
  "1018557->1018556": ["other", false, "driving joke, no need"],
  "827597->827595": ["apps_services", true, "weak purchase_billing via 'out of order'; messages deleted = data loss"],
  "1774855->1774854": ["software_quality", false],
  "682049->682048": ["software_quality", false, "weak other; I-bug"],
  "704528->704527": ["backup_sync", false],
  "1698418->1698417": ["software_quality", false],
  "1597313->1597315": ["software_quality", false],
  "1449266->1449269": ["other", true, "no need named but phone unusable ASAP"],
  "872687->872689": ["software_quality", false],
  "1792807->1792806": ["software_quality", false, "weak device_hardware via 'screen'; screen-record feature failure"],
  "2555411->2555410": ["device_hardware", true, "weak other; headphone failure + service center unresolved + case no."],
  "1900353->1900350": ["device_hardware", false, "weak howto; defective 6+ repair question"],
  "811793->811792": ["battery_power", false],
  "1756426->1756424": ["software_quality", false, "weak other; I-bug"],
  "386531->386530": ["software_quality", false, "weak device_hardware; landscape keyboard space"],
  "260035->260033": ["account_login", true, "cannot access Apple ID info"],
  "2871727->2871726": ["account_login", true, "charged on unused Apple ID"],
  "2241192->2241191": ["purchase_billing", false, "order contact question"],
  "2301181->2301182": ["purchase_billing", false],
  "600427->600426": ["account_login", false, "Face ID question"],
  "1930677->1930676": ["software_quality", true, "weak software_update; freezing+crashing, 'barely useable'"],
  "284946->284944": ["battery_power", false],
  "2776051->2776050": ["software_quality", false],
  "620198->620196": ["connectivity", false],
  "1742387->1742386": ["software_quality", false, "weak device_hardware; iOS glitches"],
  "550715->550717": ["purchase_billing", false, "weak other; accessory missing/incompatible purchases"],
  "2309238->2309237": ["apps_services", false, "weak connectivity; iMessage delivery per boundary"],
  "1889735->1889734": ["purchase_billing", true, "screen black + wallet + notes-erase multi; purchase first"],
  "2962853->2962852": ["account_login", false, "repeated password prompts"],
  "1149756->1149755": ["connectivity", false, "maps on cellular only"],
  "589563->589562": ["other", false, "weak apps_services; version + link follow-up, no need"],
  "338921->338920": ["apps_services", false, "weak software_update; FaceTime crash per boundary"],
  "400879->400878": ["backup_sync", false, "cloud backup question"],
  "53561->53560": ["battery_power", false, "turned off for no reason"],
  "2508239->2508238": ["software_quality", true, "weak howto; Apple-logo blink loop, black all day"],
  "2793219->2793217": ["apps_services", false, "weak software_quality; App Store install failure"],
  "854524->854523": ["battery_power", false, "multi:crash; battery first"],
  "53536->53535": ["software_update", false, "angry rant, no symptom"],
  "1451557->1451556": ["software_quality", false, "weak software_update; ?-marks = I-bug symptom"],
  "1858983->1858982": ["battery_power", false, "multi:freeze; battery first"],
  "2195171->2195170": ["connectivity", false, "weak device_hardware; AirPlay audio-only"],
  "1266515->1266514": ["apps_services", false],
  "595807->595806": ["purchase_billing", false],
  "1941909->1941908": ["purchase_billing", false, "purchase first over Music app"],
  "2545703->2545702": ["connectivity", false, "bluetooth headset"],
  "1882156->1882154": ["battery_power", false],
  "1387608->1387606": ["other", false, "joke, no need"],
  "459587->459586": ["other", false, "weak software_update; vague software-issues rant, no need"],
  "2139933->2139932": ["software_update", false],
  "2220768->2220767": ["software_quality", false],
  "1162116->1162115": ["connectivity", false],
  "2913352->2913351": ["apps_services", true, "iMessage dead a month + support no-solution"],
  "2013681->2013680": ["software_quality", false],
  "2689475->2689477": ["software_update", false, "bare version"],
  "2945796->2945794": ["apps_services", false, "alarm app"],
  "2354983->2354984": ["other", false],
  "1825390->1825388": ["backup_sync", false, "restored pics/vids; restore first"],
  "2013079->2013078": ["battery_power", false, "iPod battery question"],
  "2580552->2580551": ["purchase_billing", false, "weak howto; cancel auto-renew subscription"],
  "506538->506537": ["apps_services", true, "ALL music gone after reinstall = content loss"],
  "2065762->2065761": ["battery_power", false],
  "11663->11662": ["account_login", false, "Face ID question"],
};

interface Cand { conversationId: string; customerMessage: string; supportResponse: string; weakIntent: string; }

function build(split: "dev" | "test", labels: Record<string, L>) {
  const cands = fs.readFileSync(path.join(DIR, `candidates-${split}.jsonl`), "utf8")
    .split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l) as Cand);
  const labelIds = new Set(Object.keys(labels));
  const candIds = new Set(cands.map((c) => c.conversationId));
  const missing = [...candIds].filter((id) => !labelIds.has(id));
  const extra = [...labelIds].filter((id) => ![...candIds].includes(id));
  if (missing.length > 0 || extra.length > 0) {
    throw new Error(`label coverage mismatch ${split}: missing=${missing.join(",")} extra=${extra.join(",")}`);
  }
  let agree = 0;
  const out = cands.map((c) => {
    const [intent, needsEscalation, note] = labels[c.conversationId];
    if (intent === c.weakIntent) agree++;
    return {
      id: c.conversationId,
      conversationId: c.conversationId,
      customerMessage: c.customerMessage,
      supportResponse: c.supportResponse,
      intent,
      needsEscalation,
      notes: note ?? "",
      weakIntent: c.weakIntent,
    };
  });
  fs.writeFileSync(path.join(DIR, `golden-${split}.jsonl`), out.map((r) => JSON.stringify(r)).join("\n") + "\n");
  return { n: out.length, agree, esc: out.filter((r) => r.needsEscalation).length };
}

function main(): void {
  const d = build("dev", DEV);
  const t = build("test", TEST);
  const n = d.n + t.n;
  const agree = d.agree + t.agree;
  console.log(`dev: n=${d.n} weak-agree=${d.agree} esc=${d.esc}`);
  console.log(`test: n=${t.n} weak-agree=${t.agree} esc=${t.esc}`);
  console.log(`total: n=${n} weak-agree=${agree} (${(100 * agree / n).toFixed(1)}%) esc=${d.esc + t.esc} (${(100 * (d.esc + t.esc) / n).toFixed(1)}%)`);
  console.log("wrote golden-dev.jsonl + golden-test.jsonl (single-annotator; no kappa - see labeling-guide.md)");
}
main();
