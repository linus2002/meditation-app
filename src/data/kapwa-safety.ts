/**
 * The wider net around Kapwa's crisis and medical word lists (`data/kapwa`):
 * word endings, common typos, Filipino and Cebuano, and Hindi (Devanagari and
 * Hinglish).
 *
 * Read against text prepared by `safetyText` (lib/kapwa): lower case, no
 * apostrophes or punctuation ("don't" is "dont"), "wanna" written out. They
 * err towards care: a needless hotline costs little, a missed one a great deal.
 *
 * No look-behind in these: Safari before 16.4 cannot parse it, and one bad
 * pattern would take the whole chat down.
 *
 * They cannot catch everything, which is why the chat also shows a crisis
 * line at all times and in every "didn't understand" reply. Never remove
 * those on the strength of this list.
 *
 * NOT clinically validated. Have a clinician and native speakers review them,
 * and add every missed phrase to lib/kapwa-safety.test.ts.
 */

export const crisisPatterns: RegExp[] = [
  // Suicide, named.
  /\bsui(c|s)(i|d)\w*/,
  /\b(kill(s|ed|ing)?|hang(ing)?|shoot(ing)?|drown(ing)?|poison(ing)?|stab(bing)?|strangl(e|ing)) myself\b/,
  /(^|[^0-9] )kms\b/, // not "ran 5 kms"
  /\bunaliv\w*/,
  /\b(end(s|ed|ing)?|tak(e|es|ing)|took) my (own )?life\b/,
  /\bend(ed|ing)? it all\b/,
  /\bwant(ed|ing)? to end (it|things|everything)\b(?! (early|with))/,
  /\bjump(ing)? (off|from) (a |the )?(bridge|building|roof|balcony|cliff)\b/,
  /\bjump(ing)? in front of (a |the )?(train|car|bus|truck)\b/,

  // Wanting to die, or not to live.
  /\b(want(ed|ing)? to|ready to|rather|going to let myself) die\b/,
  /\b(thinking (of|about)|feel like) dying\b(?! of laugh)/,
  /\brather be dead\b/,
  /\bwish (i|i d) (was|were) (dead|never born)\b/,
  /\bwish (i )?(could die|would die|(had |was )?never (been born|born|woken|woke))/,
  /\b(hope|wish) i (dont|wont|didnt|never|wouldnt) (wake|woke)/,
  /\bdont want to wake up\b(?! (early|late|at))/,
  /\bdont want to (live|be alive|exist)\b/,
  /\bdont want to be here any ?more\b/,
  /\bno (reason|point) ((to|in|for|of) )?(live|living|being alive)\b/,
  /\bpoint (of|in) (living|being alive|my life)\b/,
  /\b(life|living) (isnt|is not|not|aint) worth\b/,
  /\bnot worth living\b/,
  /\bcant go on\b/,
  /\bbetter off (dead|without me|if i)\b/,

  // The same ideas, said less directly: death, escape, hopelessness, burden.
  /\b(end|finish|destroy|delete|get rid of|punish|starve|cut|slit|hate) myself\b(?! (some slack|off|a slice|shaving))/,
  /\b(want\w*|plan\w*|ready|going|rather|wish\w*|deserve\w*|meant|need|try\w*|tried|better|easier) (to |i could |i would )?(die|be dead|be gone|disappear|vanish|stop existing|not exist)\b/,
  /\bif i (died|die|was dead|were dead|was gone|were gone|disappeared|wasnt here|werent here|wasnt around|werent around)\b/,
  /\b(think\w*|thought\w*|dream\w*|fantasi\w*|obsess\w*) (about|of) (death|dying|being dead|ending)\b(?! of laugh)/,
  /\b(no|any|see a|have a) future (for me|anymore|left)\b|\bdont (see|have) (a |any )?future\b/,
  /\b(no|any) (hope left|way out|reason to (stay|keep going|wake up))\b/,
  /\b(nothing|no one|nobody) (left )?to live for\b/,
  /\b(feel\w*|am|im|its|everything is|life is) (so |completely |totally )?hopeless\b/,
  /\b(done|finished|through) (with )?(living|life|being alive)\b/,
  /\b(hate|tired of|sick of|cant stand|give up on|giving up on|gave up on) (being alive|living|life)\b/,
  /\bout of (this )?life\b/,
  /\blife (has|have|holds) no (meaning|point|purpose)\b|\blife is (pointless|meaningless)\b/,
  /\bwant (it|this|everything|it all) (to be )?(all )?over\b|\bwant (it|this|everything|the pain) to (end|stop) forever\b/,
  /\bto end (it|it all|everything)\b(?! (early|with|the))/,
  /\bnever (wake|waking) up\b|\bnot wak(e|ing) up (again|anymore|tomorrow)\b/,
  /\bsleep forever\b/,
  /\b(im|i am|just|being|such|only) a burden\b/,
  /\bcant (take|do) (it|this) any ?more\b/,
  /\b(saying|said|say) (my )?(final |last )?goodbye to everyone\b|\b(final|last) goodbye\b/,
  /\bnoose\b|\bgiving away (all )?my (things|stuff|belongings)\b/,

  /\b(should|might as well|i could|id|just) (just )?(die|stop existing|be dead)\b/,
  /\bstop existing\b|\bnothing left for me\b/,
  /\ba burden (to|on|for)\b/,
  /\b(happier|easier|better) (off )?(if i (was|were) )?dead\b/,
  /\bwant (it|everything|the pain|this|my life) to (end|be over)\b(?! (early|quickly|soon))/,
  /\b(suicide|goodbye) (note|letter)\b|\b(note|letter) to my (family|parents|kids|children|friends)\b.*\bready to go\b/,

  /\bbetter (off )?without me\b|\b(nobody|no one) needs me\b/,
  /\bno will to live\b|\bending (everything|it all|things)\b/,
  /\bdo something to myself\b/,
  /\bpain to (stop|end|go away) (for good|forever|permanently)\b/,
  /\b(bought|saved|saving|hoard\w*|collect\w*) (up )?(pills|tablets) to\b/,

  // Self-harm and overdose.
  /\b(been|started|back to|keep|kept) cutting\b(?! (back|down|out|carbs|calories|onions))/,
  /\b(cut\w*|slit\w*|slash\w*) (my |open my )?(wrists?|veins)\b/,
  /\b(drank|drink\w*|swallow\w*) (bleach|poison|pesticide|detergent|muriatic)\b/,
  /\b(took|taken|take|taking|swallow\w*) (all|a bunch of|a lot of|lots of|a handful of|the whole bottle of|every one of) ?(of )?(my |the )?(pills|tablets|meds|medication|sleeping pills)\b/,
  /\bwhole bottle of (pills|tablets|meds)\b/,
  /\bself ?harm\w*/,
  /\b(hurt(s|ing)?|harm(s|ed|ing)?) myself\b/,
  /\bcut(s|ting)? myself\b(?! (some slack|off|a slice|shaving))/,
  /\b(burn\w*|hit\w*|injur\w*) myself (on purpose|deliberately)\b/,
  /\boverdos\w*/,
  /\btoo many (pills|tablets|sleeping pills)\b/,

  // Filipino and Cebuano.
  /\b(tapusin|wakasan)( na)? (lahat|ang lahat)\b/,
  /\b(ayaw|ayoko|ayokong)( \w+){0,3} magising\b(?! (ng |nang )?maaga)/,
  /\bsana( \w+){0,4} (di|hindi)( \w+){0,3} (pinanganak|ipinanganak|isinilang)\b/,
  /pakamatay/,
  /\bmamatay\b(?! (sa |kaka)?(tawa|kakatawa))/,
  /\w*(patayin|patyon|kitil|kitlin|sugat|sinugat|saksakin|sinaksak|lunurin|laslas)\w*( \w+){0,4} (sarili|buhay|kaugalingon)/,
  /\b(dahilan|rason|gana|ganahan|silbi)( \w+){0,3} (mabuhay|mabuhi)\b/,
  /\b(dili|di|ayaw|ayoko|wala)( \w+){0,4} mabuhi\b/,
  /\b(suko|sawa|ayoko|ayaw|pagod)( \w+){0,3} sa (buhay|mundo\w*)\b/,
  /\b(magpahinga|matulog)( \w+){0,2} (habambuhay|habang buhay|habangbuhay)\b/,
  /\bwala( \w+){0,3} (pag ?asa|kinabukasan)\b|\bwalang pag ?asa\b/,
  /\bpabigat( \w+){0,2} ako\b|\bpabigat lang\b/,
  /\b(gusto|gustong|nais)( \w+){0,3} mamatay\b/,
  /\bsana (mamatay|patay)( na| lang| nalang)* ako\b/,
  /\bmamatay( na| lang| nalang| sana)+ ako\b/,
  /\b(ayoko|ayokong|ayaw|di ko na gusto|hindi ko na gusto)( \w+){0,3} mabuhay\b/,
  /\bpagod( \w+){0,3} mabuhay\b/,
  /\b(wala|walang)( na| ng| nang)* (saysay|kwenta|kuwenta|silbi)( ang| yung)? buhay\b/,
  /\b(tapusin|wakasan|tatapusin|wawakasan)( \w+){0,3} buhay\b/,
  /\bgusto (ko|kong|konang)( na| nang| ng| po)* mawala( sa mundo| na lang| nalang|$)/,
  /\bsana( \w+){0,3} (di|hindi|wag|huwag)( \w+){0,3} magising\b/,
  /\bsana (di|hindi|wag|huwag)( \w+){0,3} magising\b/,
  /\b\w*(saktan|sasaktan)( \w+){0,3} sarili\b/,
  /laslas/,
  /hik(o|u)g\b/,
  /bigti\b/,

  // Hindi, in Devanagari. Read after `foldScripts`: no nukta (ज़ is ज, ड़ is
  // ड) and chandrabindu as anusvara (हूँ is हूं). JavaScript's \b only knows
  // English letters, so these use plain spaces instead.
  /आत्म ?हत्या|खुदकुशी|सुसाइड/,
  /(मरना|मर जाना|मरने|मर जाने) (चाहत|का मन|का दिल|की इच्छा)/,
  /मर (जाऊं|जाउं|जाऊ|जाता तो|जाती तो)/,
  /जान (दे दूं|दे दूंगा|दे दूंगी|देना चाहत|लेना चाहत|ले लूं|ले लूंगा|ले लूंगी|देने का|लेने का)/,
  /(जीना|जीने|जिंदा रहना|जिंदा रहने) (नहीं|नही) चाहत/,
  /जीने (की|का) (कोई )?(वजह|कारण|मतलब|मकसद|इच्छा|मन|दिल) (नहीं|नही)/,
  /(खुद|अपने आप) को (मार|खत्म|नुकसान|चोट|काट|जला|हानि)/,
  /(जिंदगी|जीवन) (खत्म|समाप्त) (कर|करना|करने)/,
  /सब (कुछ )?खत्म कर (दूं|दूंगा|दूंगी|देना चाहत)/,
  /फांसी (लगा|लगाना|लगाने|लगा लूं)|(नस|कलाई) काट|जहर (खा|पी)/,
  /(सारी|बहुत सारी|सब) (गोलियां|गोलियाँ) (खा|निगल)/,
  /(बोझ हूं|बोझ हूँ|बोझ बन गया|बोझ बन गई)/,
  /(मौत|मृत्यु) (चाहिए|चाहत|आ जाए)/,
  /(कोई )?(उम्मीद|आशा) (नहीं बची|बाकी नहीं|खत्म हो गई)/,

  // Hindi in English letters (Hinglish), spelled the many ways people type it.
  /\b(khudkushi|khudkhushi|aatmhatya|atmhatya|aatm hatya)\b/,
  /\b(marna|mar jana|mar jaana|marne|mar jaane) (chahta|chahti|chahte|chahata|chahati|ka man|ka mann|ka dil)\b/,
  /\bmar (jaun|jaau|jaaun|jau|jaoon)\b/,
  /\b(jeena|jina|jeene|jine|zinda rehna|zinda rehne) (nahi|nhi|nahin|nai) (chahta|chahti|chahte)\b/,
  /\b(jeene|jine) (ki|ka) (koi )?(wajah|vajah|wajeh|karan|matlab|maksad|man|mann|dil|ichha) (nahi|nhi|nahin|nai)\b/,
  /\bkhud ko (maar|mar|khatam|khatm|khtm|nuksan|nuksaan|nukshan|nuksan pahunch|chot|hurt|kaat|kat|jala)/,
  /\b(apni )?jaan (dena|lena|de dun|le lun|de doon|le loon|de dunga|le lunga|de dungi|le lungi|dene ka|lene ka)\b/,
  /\b(zindagi|jindagi|zindgi|jeevan|jivan) (khatam|khatm|khtm|samapt) (kar|karna|karne|kardu|kar du|kar doon)/,
  /\b(sab|sabkuch|sab kuch) khatam kar (du|doon|dun|dunga|dungi|dena)\b/,
  /\b(phansi|fansi) (laga|lagana|lagaun|lagalu|lga)|\b(nas|nase|kalai) kaat|\b(zeher|zehar|jahar|jeher|zahar) (kha|pi|pee)/,
  /\b(saari|sari|bahut saari|bahut sari|sab) (goliyan|goliya|pills|tablets) (kha|nigal)/,
  /\b(bojh|boj) (hoon|hu|hun|ban gaya|ban gayi)\b/,
  /\b(maut|mout) (chahiye|chahta|chahti|aa jaye)\b/,
];

export const medicalUrgentPatterns: RegExp[] = [
  /\bchest( \w+){0,2} (pain\w*|hurt\w*|tight\w*|pressure|crushing)\b/,
  /\b(pain\w*|pressure|tight\w*|crushing)( in| on)?( my| the)? chest\b/,
  /\b(cant|couldnt|unable to|struggl\w* to|hard to|hard time|trouble|difficulty|difficult to) breath\w*/,
  /\b(cough|throw|vomit|spit|pee|poop)\w*( up)? blood\b/,
  /\b(seizures?|seizing|convuls\w*)\b/,
  /\b(having|signs of) a stroke\b/,
  /\bface( is)? droop\w*|\bdrooping face\b/,
  /\bslurr\w* (speech|words)\b|\bspeech( is)? slurr\w*/,
  /\bheart attack\b/,
  /\bthroat( is)? (closing|swelling)\b/,
  /\banaphyla\w*/,
  /\b(fainted|fainting|passing out|blacked out)\b/,
  /\bfever(s|ish)?\b/,

  /\bcatch my breath\b|\bgasping\b|\bcant get (any |enough )?air\b|\bchoking\b/,
  /\b(lips|fingers|face|skin)( are| is)?( turning| going| gone| look\w*)? blue\b/,
  /\b(side|arm|face|leg)( of my \w+)?( is| are| feels?| went| gone| going)? (numb|paraly[sz]ed|drooping)\b/,
  /\b(vomit\w*|throw\w* up|puk\w*)( \w+){0,2} (nonstop|non stop|constantly|all day|wont stop|cant stop)\b/,
  /\b(unconscious|unresponsive|not responding|collapsed|severe allergic)\b/,
  /\btemp\w*( is| of)? (38|39|40|41|10[0-5])\b/,
  /\bbleeding (a lot|heavily|badly)\b/,

  /\bchest( \w+){0,4} (elephant|squeez\w*|crush\w*)\b/,
  /\b(not|stopped|isnt) breathing\b/,
  /\bburning up\b/,
  /\b(its|it is|think its|maybe) a stroke\b/,
  /\bblood( \w+){0,2} cough\w*/,

  // Filipino.
  /\b(suka|nagsusuka)( nang| ng| na)? suka\b/,
  /\bnanghihina( \w+){0,2} (braso|kalahati)\b/,
  /(sakit|kirot|bigat|sikip)\w*( \w+){0,2} dibdib\b/,
  /\bdibdib( \w+){0,2} \w*(sakit|kirot|sikip)/,
  /\b(hirap|nahihirapan|di|hindi)( \w+){0,2} (huminga|makahinga)\b/,
  /lagnat/,
  /\b(dumudugo|nagdurugo)\b/,
  /\b(sumusuka|umuubo)( \w+){0,2} dugo\b/,
  /himatay/,
  /k(u|o)mbuls/,

  // Hindi, in Devanagari (folded, as above).
  /(सीने|छाती) (में|मे) (दर्द|जकडन|भारीपन|दबाव)/,
  /(सांस|श्वास) (नहीं|नही|लेने में|लेने मे|फूल|रुक)|दम घुट/,
  /बुखार|बेहोश|लकवा|दिल का दौरा|दौरा (पड|आया)/,
  /(खून|रक्त) (की उल्टी|खांसी|आ रहा|बह रहा)|(उल्टी|खांसी) (में|मे) (खून|रक्त)/,
  /(लगातार|बार बार) उल्टी/,

  // Hinglish.
  /\b(seene|sine|seena|chhati|chati|chaati) (me|mein|main|mai|mei) (dard|jakdan|bhari|dabav|dabaav)/,
  /\b(saans|sans|saas|swas) (nahi|nhi|nahin|nai|lene me|lene mein|lene main|phool|ruk)|\bdam ghut/,
  /\b(bukhar|bukhaar|bukar)\b|\bbehosh|\blakwa\b|\bdil ka daura\b|\b(daura|dora) (pad|pada|padaa|aaya|aya)\b/,
  /\b(khoon|khun) (ki ulti|aa raha|aa rha|nikal|beh)|\b(ulti|khansi) (me|mein) (khoon|khun)\b/,
  /\b(lagatar|baar baar|bar bar) ulti\b/,
];
