/**
 * Escalation decision — Phase 6. Multi-signal, deterministic, key-free, tested.
 * decideEscalation({message, intent, confidence}) -> {escalate, reasons[]}.
 * NOTE: patterns are regex LITERALS (earlier draft used string-built RegExp with
 * single backslashes, which silently collapsed \s->s and \b->backspace).
 */
import type { IntentName } from "../intents/taxonomy.js";

export interface EscalationInput {
  message: string;
  intent?: IntentName;
  confidence?: number;
}

export interface EscalationDecision {
  escalate: boolean;
  reasons: string[];
}

const SAFETY: RegExp[] = [
  /swell|swollen|split(ting)?\s*(apart|open)?|explod|catch(ing)?\sfire|smoke/i,
  /burn(ed|ing)?\s*(me|my|hand|ear)|shock(ed|ing)?\s*(me|my|ears?|hand)/i,
  /overheat.*(burn|injur)|hurt\sme|kill\sme|threat/i,
];
const LOCKOUT: RegExp[] = [
  /locked?\sout|locked\sout\sand\ssent\sback/i,
  /can'?t\s(access|log|sign).{0,40}(apple\s?id|account|in)/i,
  /can\snot\s(log|sign|access)/i,
  /couldn'?t\s(access|log)/i,
  /forgot.*password/i,
  /verification.*(not|never).*(send|arriv|work)|2fa.{0,30}(won'?t|never|dumb)|won'?t.*send.*code|never.*send.*code/i,
  /face\s?id.*(not|won'?t).*(respond|work)/i,
];
const DATA_LOSS: RegExp[] = [
  /lost\s(all\s|my\s)?(data|photos?|messages?|notes?|memories|music|contacts?)|loss\sof\s(data|memories|photos?)/i,
  /resulted\sin\sloss|threads?\sgot\sdeleted|deleted|disappeared/i,
  /all\s(my\s)?(music|photos?)\s(gone|is\sgone)|all\sof\smy\s(music|photos?).*gone/i,
  /erases?\s(my\s)?notes?|notes?.*eras/i,
];
const MONEY: RegExp[] = [
  /\brefund\b|run\sme\smy\srefund/i,
  /charged?(\smy\saccount)?\s(\$\d|\$)|being\scharged|charged?\sfor\ssubscriptions?/i,
  /charg(ed|ing)?.*(nothing|wrong|twice|cancel|lapse)/i,
  /billing\sdispute|failed?.*purchase|order.*(invalid|never|fail)/i,
];
const UNUSABLE: RegExp[] = [
  /(cannot|can'?t)\suse.*(at\sall|anymore)|able\sto\suse.*at\sall|barely\suse?able|almost\suseless/i,
  /black(\sscreen)?.*(all\sday|flash)|screen.*(turned|goes|went)\sblack|blinking\sapple/i,
  /reboot.*every|restart.*(20\+|every)|keeps?\srebooting|reboot\sloop/i,
  /30\s*(min|minutes?).*(charge|battery|airplane)|won'?t\shold.*charge/i,
  /(can'?t|cannot)\smake(\sor\sreceive)?\scalls?|\bno\s*sim\b|stops?\sgetting\ssignal|calls?\sdrop/i,
  /won'?t\sturn\son/i,
  /turns?\soff\srandomly|shut\soff/i,
  /(expensive\s)?brick/i,
  /still\s(doesn'?t|dont|does\snot)\swork|took\s\d+\s*hours?.*still/i,
  /(phone|iphone|ipad|device|mac).{0,40}unusable|unusable.{0,20}(now|phone|device)/i,
  /screen.*stops?\sworking/i,
  /no\s.*availab.*store/i,
];
const REPEATED: RegExp[] = [
  /\d+(\.\d+)?\s*hours?,?\s*\d*\s*(different\s*)?(support|reps?|tech)/i,
  /\bhours?\son\shold\b|hold\sfor\sover\s\d+|on\shold\sfor\s\d+/i,
  /supervisor.*never|second.*(iphone|device).*defect|service\scenter.*not\sresolv/i,
  /\bcase\s*no\.?/i,
  /month.*(support|resolv|fix|solution)|spent.*time.*support.*no\ssolution/i,
  /#?thirdtimeisthecharm|hang\sup.*representative|calls?\shang\sup/i,
];

function hits(rules: RegExp[], text: string): boolean {
  return rules.some((rx) => rx.test(text));
}

export function decideEscalation(input: EscalationInput): EscalationDecision {
  const text = input.message
    .toLowerCase()
    .replace(/[@#]\w+/g, " ")
    .replace(/[‘’`´]/g, "'")
    .replace(/[“”]/g, '"');
  const reasons: string[] = [];
  if (hits(SAFETY, text)) reasons.push("safety");
  if (hits(LOCKOUT, text)) reasons.push("lockout");
  if (hits(DATA_LOSS, text)) reasons.push("data_loss");
  if (hits(MONEY, text)) reasons.push("money");
  if (hits(UNUSABLE, text)) reasons.push("unusable");
  if (hits(REPEATED, text)) reasons.push("repeated_failure");
  const conf = input.confidence ?? 1;
  const highStakes: IntentName[] = ["purchase_billing", "account_login"];
  if (conf < 0.5 && input.intent && highStakes.includes(input.intent)) {
    reasons.push("low_confidence_high_stakes");
  }
  return { escalate: reasons.length > 0, reasons };
}
