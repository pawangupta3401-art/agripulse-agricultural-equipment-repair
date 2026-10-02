/**
 * AgriPulse 1000+ Q&A Agricultural Knowledge Base
 * 
 * Comprehensive diagnostic and maintenance knowledge base for Indian farmers,
 * covering Tractors, Power Tillers, Irrigation Pumps, Sprayers, Rotavators,
 * Harvesters, Electrical, Hydraulics, Diesel Systems, and AgriPulse Services.
 * 
 * Each entry is crafted in natural, simple spoken Hindi suitable for voice synthesis (TTS),
 * with symptom tags, colloquial aliases, and safe farmer steps.
 */

export interface KnowledgeEntry {
  id: string;
  category: "tractor" | "power_tiller" | "pump" | "sprayer" | "rotavator" | "harvester" | "electrical" | "maintenance" | "app";
  categoryHi: string;
  questionHi: string;
  questionEn: string;
  aliases: string[]; // colloquial phrases, hinglish, voice variations
  keywords: string[]; // token matching
  answerHi: string; // voice script: simple, conversational, crisp Hindi
  answerEn: string;
  steps: string[];
  warning?: string;
  mechanicRequired: boolean;
}

export const AGRICULTURAL_KNOWLEDGE_BASE: KnowledgeEntry[] = [
  // =========================================================================
  // 1. TRACTOR - ENGINE & STARTING (ट्रैक्टर - इंजन व स्टार्टिंग)
  // =========================================================================
  {
    id: "tr_start_01",
    category: "tractor",
    categoryHi: "ट्रैक्टर - स्टार्टिंग",
    questionHi: "ट्रैक्टर में चाबी घुमाने पर सिर्फ कट-कट की आवाज आती है और स्टार्ट नहीं होता, क्या करें?",
    questionEn: "Tractor makes clicking sound on turning key and doesn't start, what to do?",
    aliases: ["कट कट आवाज", "सेल्फ नहीं ले रहा", "click click sound", "starter motor click", "chabi ghumane par aawaz", "self nahi lag raha"],
    keywords: ["कट-कट", "आवाज", "चाबी", "सेल्फ", "स्टार्ट", "बैटरी", "रिले", "starter", "click"],
    answerHi: "यह समस्या आमतौर पर बैटरी कमजोर होने या स्टार्टर रिले का कनेक्शन ढीला होने से होती है। पहले बैटरी के दोनों खूंटों पर जमा कार्बन साफ करें और तारों को टाइट करें। यदि फिर भी कट-कट आवाज आए तो बैटरी चार्ज करवाएं या जंप स्टार्ट करें।",
    answerEn: "This is usually caused by a weak battery or loose starter relay terminal. Clean any carbon on battery terminals and tighten clamps.",
    steps: [
      "बैटरी के खूंटों पर गर्म पानी डालकर कार्बन व सफेद चूना साफ करें।",
      "टर्मिनल के नट-बोल्ट 10 या 12 नंबर पाने से अच्छी तरह कसें।",
      "अगर हेडलाइट जलाने पर रोशनी बहुत धीमी है तो बैटरी डिस्चार्ज है, चार्ज करवाएं।"
    ],
    warning: "गर्म इंजन पर स्टार्टर को लगातार 15 सेकंड से अधिक न घुमाएं, स्टार्टर मोटर जल सकती है।",
    mechanicRequired: false
  },
  {
    id: "tr_start_02",
    category: "tractor",
    categoryHi: "ट्रैक्टर - स्टार्टिंग",
    questionHi: "ट्रैक्टर का सेल्फ घूम रहा है लेकिन इंजन चालू नहीं हो रहा, क्या कारण है?",
    questionEn: "Tractor self is cranking properly but engine doesn't fire, why?",
    aliases: ["सेल्फ घूम रहा है पर चालू नहीं", "crank ho raha hai start nahi", "engine ghum raha hai", "diesel nahi pakad raha", "engine chalu nahi hota"],
    keywords: ["सेल्फ", "घूम रहा", "चालू नहीं", "डीजल", "फायर", "एयर लॉक", "crank"],
    answerHi: "अगर सेल्फ तेजी से घूम रहा है लेकिन इंजन चालू नहीं हो रहा, तो डीजल लाइन में हवा (एयर लॉक) आ गई है या डीजल फिल्टर चोक हो गया है। हैंड प्राइमर पंप से 15-20 बार डीजल पंप करके एयर ब्लीड स्क्रू से हवा निकालें।",
    answerEn: "Engine is cranking but not firing usually means air lock in fuel line or choked diesel filter. Bleed fuel system using hand primer.",
    steps: [
      "चेक करें कि डीजल टैंक में पर्याप्त डीजल है और डीजल कॉक (नल) खुला है।",
      "डीजल फिल्टर के ऊपर लगे 10 नंबर स्क्रू को हल्का ढीला करें।",
      "हैंड फीड पंप से डीजल दबाएं जब तक कि बिना बुलबुले के साफ डीजल न निकलने लगे।",
      "स्क्रू टाइट करें और फिर सेल्फ लगाएं।"
    ],
    warning: "अगर ब्लीडिंग के बाद भी स्टार्ट न हो तो FIP पंप में समस्या हो सकती है, अधिक सेल्फ न लगाएं।",
    mechanicRequired: true
  },
  {
    id: "tr_start_03",
    category: "tractor",
    categoryHi: "ट्रैक्टर - स्टार्टिंग",
    questionHi: "सर्दियों में सुबह ट्रैक्टर जल्दी स्टार्ट क्यों नहीं होता और क्या उपाय करें?",
    questionEn: "Why does tractor have cold starting trouble in winter mornings and what to do?",
    aliases: ["सर्दियों में स्टार्ट नहीं होता", "ठंडी में चालू नहीं", "winter starting", "cold start problem", "subah start nahi hota", "heater plug"],
    keywords: ["सर्दी", "सर्दियों", "सुबह", "ठंड", "हीटर", "ग्लो प्लग", "cold", "winter"],
    answerHi: "सर्दियों में इंजन ऑयल गाढ़ा हो जाता है और डीजल का तापमान कम होने से दहन नहीं हो पाता। चाबी को हीटर (ग्लो प्लग) की दिशा में 15 से 20 सेकंड तक दबाकर रखें ताकि चैंबर गर्म हो जाए, फिर क्लच दबाकर सेल्फ लगाएं।",
    answerEn: "In cold weather oil thickens and diesel ignition takes longer. Engage the pre-heater / glow plug for 15-20 seconds before cranking.",
    steps: [
      "क्लच पैडल को पूरा दबाकर रखें ताकि इंजन पर गियरबॉक्स का लोड न रहे।",
      "हीटर बत्ती जलने तक ग्लो प्लग स्विच को ऑन रखें (लगभग 15-20 सेकंड)।",
      "हल्का थ्रॉटल (एक्सीलेटर) आधा देकर सेल्फ लगाएं।",
      "सर्दियों में 15W-40 मल्टीग्रेड ऑयल का ही इस्तेमाल करें।"
    ],
    warning: "एयर क्लीनर में कपड़ा जलाकर या पेट्रोल डालकर स्टार्ट करने की खतरनाक गलती कभी न करें।",
    mechanicRequired: false
  },
  {
    id: "tr_start_04",
    category: "tractor",
    categoryHi: "ट्रैक्टर - स्टार्टिंग",
    questionHi: "चाबी घुमाने पर कुछ भी नहीं होता, न कोई आवाज न कोई लाइट जलती है, क्या खराबी है?",
    questionEn: "Turning the key does nothing at all, no lights and no sound, what is wrong?",
    aliases: ["बिल्कुल सन्नाटा", "कोई लाइट नहीं जल रही", "dead battery", "no power", "chabi par kuch nahi hota", "fuse ud gaya"],
    keywords: ["सन्नाटा", "लाइट", "फ्यूज", "मेन फ्यूज", "तार कटा", "बैटरी डेड", "dead"],
    answerHi: "यह मुख्य रूप से मेन फ्यूज उड़ने, बैटरी के पूरी तरह डेड होने या बैटरी के अर्थिंग (ग्राउंड) तार के टूट जाने या कटने से होता है। बैटरी के दोनों तारों का अर्थिंग कनेक्शन और 60 एंपियर का मेन फ्यूज बॉक्स चेक करें।",
    answerEn: "Complete electrical deadness indicates a blown main fuse, disconnected battery earth ground cable, or totally drained battery.",
    steps: [
      "बैटरी से चेसिस पर लगे काले अर्थिंग केबल को हिलाकर देखें कि वह ढीला तो नहीं है।",
      "स्टीयरिंग के नीचे लगे मुख्य फ्यूज बॉक्स में 50A/60A मेन फ्यूज चेक करें।",
      "यदि चूहे ने तार काट दिया हो तो टेपिंग करें या वायर हार्नेस बदलवाएं।"
    ],
    mechanicRequired: false
  },
  {
    id: "tr_smoke_01",
    category: "tractor",
    categoryHi: "ट्रैक्टर - धुआं",
    questionHi: "ट्रैक्टर लोड पर बहुत ज्यादा काला धुआं दे रहा है और जोर नहीं पकड़ रहा, क्या कारण है?",
    questionEn: "Tractor emits excessive black smoke under load and loses power, what is the cause?",
    aliases: ["काला धुआं", "black smoke", "kala dhua", "zor nahi pakad raha", "power drop", "dum ghut raha hai"],
    keywords: ["काला धुआं", "धुआं", "जोर", "पावर", "एयर फिल्टर", "इंजेक्टर", "काला", "black"],
    answerHi: "काला धुआं निकलने का मतलब है कि इंजन में डीजल ज्यादा जा रहा है और हवा कम मिल रही है। 90% मामलों में इसका कारण सूखा या गीला एयर फिल्टर चोक होना होता है। एयर फिल्टर निकालकर साफ करें या बदलें।",
    answerEn: "Black smoke signifies incomplete diesel combustion due to air starvation or injector dripping. Clean or replace the air filter element first.",
    steps: [
      "एयर क्लीनर का कटोरा खोलें और प्राथमिक फिल्टर पर जमी धूल को हल्के हाथ से झाड़ें।",
      "यदि ऑयल बाथ एयर फिल्टर है तो गंदा ऑयल बदलकर साफ इंजन ऑयल भरें।",
      "यदि फिल्टर साफ करने के बाद भी काला धुआं आए तो इंजेक्टर नोजल सर्विस करवाएं।"
    ],
    warning: "फिल्टर को कभी लोहे की चीज से न पीटें और न ही पेपर एलिमेंट को पानी से धोएं।",
    mechanicRequired: false
  },
  {
    id: "tr_smoke_02",
    category: "tractor",
    categoryHi: "ट्रैक्टर - धुआं",
    questionHi: "ट्रैक्टर के साइलेंसर से सफेद धुआं निकल रहा है और पानी की बूंदें टपक रही हैं, क्या समस्या है?",
    questionEn: "White smoke is coming from tractor exhaust with water droplets, what is the issue?",
    aliases: ["सफेद धुआं", "white smoke", "safed dhua", "pani nikal raha hai", "head gasket blown"],
    keywords: ["सफेद धुआं", "सफेद", "पानी", "रेडिएटर", "गैस्केट", "head gasket", "white"],
    answerHi: "सफेद धुआं इंजन में पानी या कूलेंट जाने का संकेत है। यह अक्सर हेड गैस्केट कटने या डीजल में पानी मिला होने के कारण होता है। रेडिएटर में बुलबुले चेक करें और इंजन को तुरंत बंद करके मैकेनिक से गैस्केट चेक करवाएं।",
    answerEn: "White smoke indicates water or coolant entering the combustion chamber, usually due to a blown cylinder head gasket or water in diesel.",
    steps: [
      "डीजल सेडिमेंटर (कांच का कटोरा) देखें, यदि नीचे पानी जमा हो तो ड्रेन स्क्रू खोलकर निकालें।",
      "इंजन ठंडा होने पर रेडिएटर का ढक्कन खोलें; अगर स्टार्ट करने पर बुलबुले उठें तो हेड गैस्केट लीक है।",
      "इंजन ऑयल का गेज निकालें; अगर ऑयल का रंग मटमैला दूधिया हो गया है तो इंजन कतई न चलाएं।"
    ],
    warning: "गैस्केट कटी होने पर ट्रैक्टर चलाने से इंजन सीज हो सकता है और पिस्टन टूट सकता है।",
    mechanicRequired: true
  },
  {
    id: "tr_smoke_03",
    category: "tractor",
    categoryHi: "ट्रैक्टर - धुआं",
    questionHi: "ट्रैक्टर नीला धुआं दे रहा है और इंजन ऑयल कम हो रहा है, इसका क्या मतलब है?",
    questionEn: "Tractor is blowing bluish smoke and consuming engine oil, what does it mean?",
    aliases: ["नीला धुआं", "blue smoke", "neela dhua", "oil kam ho raha hai", "mobil kha raha hai", "ring piston"],
    keywords: ["नीला धुआं", "नीला", "मोबिल", "ऑयल कम", "पिस्टन रिंग", "blue"],
    answerHi: "नीला धुआं इस बात का पक्का संकेत है कि इंजन का मोबिल ऑयल (इंजन ऑयल) पिस्टन के ऊपर जल रहा है। इसका कारण पिस्टन रिंग घिस जाना, वाल्व सील कटना या लाइनर का घिसना है। इंजन की ओवरहालिंग की जरूरत है।",
    answerEn: "Blue smoke indicates engine oil burning in the combustion chamber due to worn piston rings, valve stem seals, or cylinder liners.",
    steps: [
      "रोज सुबह स्टार्ट करने से पहले डिपस्टिक से ऑयल लेवल चेक करें और पूरा रखें।",
      "इंजन ब्रीदर पाइप से देखें कि क्या भारी बैक-कंप्रेशन (कच्चा धुआं) आ रहा है।",
      "AgriPulse ऐप से नजदीकी प्रमाणित ट्रैक्टर मैकेनिक बुक करके रिंग-पिस्टन की जांच करवाएं।"
    ],
    mechanicRequired: true
  },
  {
    id: "tr_heat_01",
    category: "tractor",
    categoryHi: "ट्रैक्टर - ओवरहीटिंग",
    questionHi: "ट्रैक्टर का तापमान कांटा लाल निशान पर चला गया और रेडिएटर से पानी उबल रहा है, क्या करें?",
    questionEn: "Tractor temperature gauge is in red zone and radiator is boiling over, what to do?",
    aliases: ["ट्रैक्टर गर्म हो गया", "रेडिएटर उबल रहा है", "overheat ho gaya", "pani ubal raha hai", "tampaman lal par hai", "red zone"],
    keywords: ["गर्म", "ओवरहीट", "रेडिएटर", "उबल", "तापमान", "कांटा", "लाल", "overheat"],
    answerHi: "तुरंत ट्रैक्टर को छाया में खड़ा करें, गियर न्यूट्रल करें और इंजन को 2 मिनट धीमी रेस (आइडल) पर चलने दें ताकि कूलेंट घूमकर इंजन को ठंडा करे, फिर बंद करें। कभी भी गर्म रेडिएटर का ढक्कन न खोलें।",
    answerEn: "Idle engine for 2 minutes to circulate coolant, then shut down. Never open a hot radiator cap directly as boiling coolant can cause severe burns.",
    steps: [
      "मशीन को बंद करके रेडिएटर की जाली देखें, उस पर भूसा या धूल चिपकी हो तो पानी से धोकर साफ करें।",
      "फैन बेल्ट की टेंशन चेक करें; बेल्ट पर 10-15 मिमी से ज्यादा ढीलापन नहीं होना चाहिए।",
      "इंजन पूरी तरह ठंडा होने के बाद ही रेडिएटर कैप खोलकर कूलेंट और पानी का स्तर पूरा करें।"
    ],
    warning: "गर्म इंजन पर तुरंत ठंडा पानी कतई न डालें, इससे इंजन ब्लॉक और हेड चटक (क्रैक) सकता है।",
    mechanicRequired: false
  },
  {
    id: "tr_heat_02",
    category: "tractor",
    categoryHi: "ट्रैक्टर - ओवरहीटिंग",
    questionHi: "रेडिएटर में पानी पूरा है फिर भी ट्रैक्टर बार-बार गर्म क्यों हो जाता है?",
    questionEn: "Radiator has full coolant but tractor still overheats frequently, why?",
    aliases: ["पानी पूरा है फिर भी गर्म", "bar bar garam hota hai", "coolant pura hai", "thermostat jam"],
    keywords: ["रेडिएटर", "बार-बार", "गर्म", "थर्मोस्टेट", "वाटर पंप", "चोक"],
    answerHi: "यदि पानी पूरा होने पर भी ट्रैक्टर गर्म हो रहा है, तो रेडिएटर की अंदरूनी तांबे/एल्युमिनियम की नालियां खारे पानी से चोक हो सकती हैं, या वाटर पंप का इंपेलर घिस गया है अथवा थर्मोस्टेट वाल्व जाम हो गया है।",
    answerEn: "Internal radiator scale buildup, stuck closed thermostat valve, or slipping water pump impeller causes overheating even when coolant is full.",
    steps: [
      "रेडिएटर को रेडिएटर फ्लश केमिकल से सर्विस करवाएं और नालियों की रॉडिंग करवाएं।",
      "चेक करें कि थर्मोस्टेट वाल्व 82 डिग्री पर खुल रहा है या नहीं।",
      "वाटर पंप के बेयरिंग और पुली में कोई चाल या पानी का रिसाव तो नहीं है।"
    ],
    mechanicRequired: true
  },
  {
    id: "tr_hyd_01",
    category: "tractor",
    categoryHi: "ट्रैक्टर - हाइड्रोलिक्स",
    questionHi: "ट्रैक्टर की हाइड्रोलिक लिफ्ट रोटावेटर या कल्टीवेटर को ऊपर नहीं उठा रही, क्या उपाय है?",
    questionEn: "Tractor hydraulic lift is not raising the rotavator/cultivator, what is the fix?",
    aliases: ["लिफ्ट नहीं उठ रही", "hydraulic nahi uth raha", "lift problem", "rotavator nahi uthata", "cultivator nahi uthata"],
    keywords: ["लिफ्ट", "हाइड्रोलिक", "रोटावेटर", "कल्टीवेटर", "उठा", "hydraulic", "lift"],
    answerHi: "हाइड्रोलिक लिफ्ट न उठने का सबसे बड़ा कारण हाइड्रोलिक ऑयल का स्तर कम होना या सक्शन फिल्टर का चोक होना है। गियरबॉक्स के पास लगा ट्रांसमिशन/हाइड्रोलिक ऑयल लेवल चेक करें और हाइड्रोलिक जालीदार फिल्टर साफ करें।",
    answerEn: "Hydraulic lift failure is most commonly caused by low transmission oil level or a choked hydraulic suction strainer.",
    steps: [
      "सीट के नीचे लगा हाइड्रोलिक फ्लो कंट्रोल नॉब चेक करें; अगर वह बंद है तो उसे क्लॉकवाइज खोलें।",
      "डिपस्टिक से ट्रांसमिशन/हाइड्रोलिक ऑयल का लेवल चेक करें और जरूरत पड़ने पर 80W-90 ऑयल डालें।",
      "हाइड्रोलिक सक्शन पाइप का फिल्टर खोलकर डीजल से धोएं।"
    ],
    warning: "बिना हाइड्रोलिक ऑयल के हाइड्रोलिक लीवर न खींचे, हाइड्रोलिक पंप सूखा चलने से कट जाएगा।",
    mechanicRequired: false
  },
  {
    id: "tr_hyd_02",
    category: "tractor",
    categoryHi: "ट्रैक्टर - हाइड्रोलिक्स",
    questionHi: "ट्रैक्टर बंद करने पर उठाई हुई लिफ्ट धीरे-धीरे अपने आप नीचे गिर जाती है, क्यों?",
    questionEn: "Why does the tractor hydraulic lift slowly drop down on its own after stopping?",
    aliases: ["लिफ्ट नीचे गिर जाती है", "lift apne aap gir jati hai", "hydraulic drop", "lift niche aana", "ram cylinder leak"],
    keywords: ["लिफ्ट", "नीचे", "गिर", "ड्रॉप", "रैम सील", "स्पूल वाल्व", "लीक"],
    answerHi: "यह हाइड्रोलिक रैम सिलेंडर की सील कटने या डिस्ट्रीब्यूटर वाल्व (स्पूल वाल्व) से ऑयल बैक लीक होने के कारण होता है। जब सील कट जाती है तो भारी इंप्लीमेंट का प्रेशर रुक नहीं पाता और लिफ्ट धीरे-धीरे नीचे बैठ जाती है।",
    answerEn: "Hydraulic lift settling down is caused by worn ram cylinder piston seals or a leaking spool control valve.",
    steps: [
      "रात में या खड़े ट्रैक्टर में हमेशा इंप्लीमेंट को जमीन पर टिकाकर रखें।",
      "हाइड्रोलिक रैम सिलेंडर की यू-सील और ओ-रिंग बदलवाने के लिए मैकेनिक से संपर्क करें।"
    ],
    mechanicRequired: true
  },
  {
    id: "tr_clutch_01",
    category: "tractor",
    categoryHi: "ट्रैक्टर - क्लच व गियर",
    questionHi: "ट्रैक्टर का गियर लगाने में चर्र-चर्र की आवाज आती है और गियर मुश्किल से लगता है, क्या करें?",
    questionEn: "Grinding noise when engaging tractor gear and shifting is hard, what to do?",
    aliases: ["गियर फंस रहा है", "चर्र चर्र आवाज", "gear grinding", "gear hard lagta hai", "clutch free play"],
    keywords: ["गियर", "आवाज", "चर्र-चर्र", "फंस", "क्लच", "पैडल", "gear", "grind"],
    answerHi: "यह क्लच पैडल की फ्री-प्ले खत्म होने या क्लच प्लेट के पूरी तरह रिलीज न होने के कारण होता है। क्लच पैडल में कम से कम 25 से 30 मिलीमीटर (लगभग 1 इंच) की फ्री-प्ले होनी चाहिए। क्लच लिंकेज रॉड के नट से फ्री-प्ले एडजस्ट करें।",
    answerEn: "Gear grinding happens when clutch does not disengage completely due to zero pedal free-play or a worn release bearing. Adjust free play to 25-30mm.",
    steps: [
      "क्लच पैडल को हाथ से दबाकर देखें, पहले 1 इंच बिना जोर के दबना चाहिए।",
      "यदि फ्री-प्ले नहीं है तो क्लच रॉड के टर्नबकल नट को ढीला करके प्ले बढ़ाएं।",
      "यदि फिर भी गियर फंसे तो प्रेशर प्लेट की फिंगर सेटिंग करवाएं।"
    ],
    mechanicRequired: false
  },
  {
    id: "tr_clutch_02",
    category: "tractor",
    categoryHi: "ट्रैक्टर - क्लच व गियर",
    questionHi: "ट्रैक्टर की रेस बढ़ रही है लेकिन पहिए उस रफ्तार से नहीं घूम रहे, क्या खराबी है?",
    questionEn: "Tractor engine revs high but wheels don't pick up speed, what is the problem?",
    aliases: ["क्लच स्लिप मार रहा है", "रेस ले रहा है भाग नहीं रहा", "clutch slip", "race leta hai bhagta nahi"],
    keywords: ["रेस", "रफ्तार", "स्लिप", "क्लच प्लेट", "घिस गई", "slip"],
    answerHi: "यह क्लच प्लेट स्लिप होने का स्पष्ट लक्षण है। क्लच लाइनिंग पूरी तरह घिस चुकी है या क्लच प्लेट पर तेल आ गया है। इस स्थिति में भारी जुताई कतई न करें, वर्ना फ्लाईव्हील का फेस भी कट जाएगा।",
    answerEn: "Clutch plate is slipping due to worn friction facing or oil contamination from rear main oil seal. Replace clutch plate and pressure plate assembly.",
    steps: [
      "तीसरे गियर में हैंडब्रेक लगाकर धीरे-धीरे क्लच छोड़ें; यदि इंजन तुरंत बंद नहीं होता तो क्लच स्लिप है।",
      "AgriPulse ऐप से क्लच प्लेट बदलने का अपॉइंटमेंट बुक करें।"
    ],
    mechanicRequired: true
  },
  {
    id: "tr_brake_01",
    category: "tractor",
    categoryHi: "ट्रैक्टर - ब्रेक",
    questionHi: "ब्रेक दबाने पर ट्रैक्टर एक तरफ खिंचता है, इसे कैसे ठीक करें?",
    questionEn: "Tractor pulls to one side when pressing brakes, how to fix?",
    aliases: ["ब्रेक एक तरफ खींचता है", "ek taraf khinchta hai", "unequal brakes", "brake pulling"],
    keywords: ["ब्रेक", "एक तरफ", "खिंचता", "एडजस्ट", "brake", "pull"],
    answerHi: "दोनों पहियों के ब्रेक पैडल का खिंचाव बराबर नहीं है। दाएँ और बाएँ ब्रेक के रॉड नट को एडजस्ट करके दोनों पहियों पर एक समान ब्रेक सेट करें, और सड़क पर चलते समय दोनों पैडल की इंटरलॉक पिन हमेशा फंसाकर रखें।",
    answerEn: "Unequal brake rod adjustment causes tractor pulling. Adjust both brake rods equally and always engage the brake pedal lock pin on roads.",
    steps: [
      "ट्रैक्टर को समतल जगह पर खड़ा करें और दोनों ब्रेक रॉड के एडजस्टिंग नट देखें।",
      "जिस तरफ ब्रेक कम लग रहा है उस साइड का नट 2-3 चूड़ी टाइट करें।",
      "खाली रास्ते पर 10 किमी/घंटा की गति पर दबाकर चेक करें कि ट्रैक्टर सीधा रुक रहा है या नहीं।"
    ],
    mechanicRequired: false
  },

  // =========================================================================
  // 2. POWER TILLER & MINI TRACTOR (पावर टिलर व मिनी ट्रैक्टर)
  // =========================================================================
  {
    id: "pt_start_01",
    category: "power_tiller",
    categoryHi: "पावर टिलर - स्टार्टिंग",
    questionHi: "पावर टिलर की रस्सी (रिकॉइल स्टार्टर) खींचने पर बहुत टाइट लगती है या हाथ वापस खींचती है, क्या करें?",
    questionEn: "Power tiller recoil pull cord is very tight or kicks back, what to do?",
    aliases: ["रस्सी टाइट खिंचती है", "हाथ झटकती है", "recoil rope tight", "kick back", "dikhari mar raha hai", "rope jam"],
    keywords: ["पावर टिलर", "रस्सी", "रिकॉइल", "टाइट", "डीकंप्रेशन", "झटका", "recoil"],
    answerHi: "पावर टिलर में इंजन कंप्रेशन बहुत ज्यादा होता है। रस्सी खींचने से पहले इंजन के हेड पर लगा डीकंप्रेशन लीवर दबाएं। रस्सी को हल्का खींचकर लॉक पर लाएं, फिर डीकंप्रेशन पकड़कर एक झटके में पूरी रस्सी खींचें।",
    answerEn: "High engine compression makes the recoil pull hard. Engage the decompression lever first, pull cord to compression point, then pull forcefully.",
    steps: [
      "डीकंप्रेशन लीवर को नीचे दबाएं।",
      "रस्सी को तब तक धीरे खींचें जब तक कि कड़ापन महसूस न हो।",
      "अब पूरी ताकत से एक बार में सपाट खींचें।",
      "यदि रस्सी बाहर फंस गई है तो रिकॉइल स्प्रिंग पर थोड़ा डब्ल्यूडी-40 स्प्रे करें।"
    ],
    warning: "रस्सी को अधूरा न खींचें, वर्ना इंजन का किक-बैक आपकी कलाई या अंगूठे में चोट मार सकता है।",
    mechanicRequired: false
  },
  {
    id: "pt_blade_01",
    category: "power_tiller",
    categoryHi: "पावर टिलर - रोटरी व ब्लेड",
    questionHi: "पावर टिलर का इंजन चल रहा है लेकिन रोटरी के ब्लेड मिट्टी में नहीं घूम रहे, क्या खराबी है?",
    questionEn: "Power tiller engine runs but rotary blades don't spin in soil, what is broken?",
    aliases: ["ब्लेड नहीं घूम रहा", "rotary blade nahi ghumta", "blade jam", "tiller blade stopped", "rotary chain"],
    keywords: ["पावर टिलर", "ब्लेड", "रोटरी", "घूम", "चेन", "वी-बेल्ट", "blade"],
    answerHi: "इसके तीन मुख्य कारण होते हैं: 1. रोटरी ड्राइव वी-बेल्ट ढीली या कट गई है। 2. रोटरी गियर लीवर न्यूट्रल पर है। 3. रोटरी केसिंग की ड्राइव चेन टूट गई है। सबसे पहले बेल्ट का तनाव और रोटरी डॉग क्लच चेक करें।",
    answerEn: "Check rotary drive V-belt tension, dog-clutch engagement lever, or broken rotary internal drive roller chain.",
    steps: [
      "इंजन बंद करके रोटरी बेल्ट गार्ड खोलें और बेल्ट का खिंचाव चेक करें।",
      "रोटरी एंगेजमेंट लीवर को आगे-पीछे करके देखें कि गियर सही फंस रहा है।",
      "यदि बेल्ट टाइट है और गियर भी लगा है, तो रोटरी बॉक्स खोलकर चेन चेक करवाएं।"
    ],
    mechanicRequired: true
  },
  {
    id: "pt_leak_01",
    category: "power_tiller",
    categoryHi: "पावर टिलर - ऑयल लीकेज",
    questionHi: "पावर टिलर के रोटरी शाफ्ट के किनारों से गियर ऑयल रिस रहा है, इसे कैसे रोकें?",
    questionEn: "Gear oil is leaking from the rotary blade axle shaft on power tiller, how to stop it?",
    aliases: ["रोटरी से तेल चू रहा है", "axle seal leak", "rotary shaft oil leak", "gear oil leak tiller"],
    keywords: ["पावर टिलर", "तेल", "लीक", "ऑयल सील", "शाफ्ट", "oil seal"],
    answerHi: "खेत में जुताई के दौरान धान का पुआल, घास या तार रोटरी शाफ्ट में लिपट जाने से ऑयल सील कट जाती है। ब्लेड निकालें, शाफ्ट से लिपटा कचरा हटाएं और नई डबल-लिप ऑयल सील लगवाएं।",
    answerEn: "Crop residue or wire wrapped around the rotary axle damages the oil seal. Remove blades, clear debris, and fit a new rotary axle oil seal.",
    steps: [
      "रोटरी हब के बोल्ट खोलकर ब्लेड का सेट बाहर निकालें।",
      "शाफ्ट पर लिपटे प्लास्टिक, धागे व घास को चाकू से काटकर साफ करें।",
      "खराब सील को पेचकस से निकालकर नई सील पर ग्रीस लगाकर बराबर ठोकें।"
    ],
    mechanicRequired: true
  },

  // =========================================================================
  // 3. IRRIGATION PUMPS & MOTORS (सिंचाई पंप व मोटर)
  // =========================================================================
  {
    id: "pump_prime_01",
    category: "pump",
    categoryHi: "सिंचाई पंप - पानी न उठाना",
    questionHi: "डीजल इंजन या मोटर पूरी स्पीड में चल रही है लेकिन पंप पानी नहीं उठा रहा, क्या कारण है?",
    questionEn: "Diesel pump or motor runs at full speed but pump doesn't deliver water, why?",
    aliases: ["पानी नहीं उठा रहा", "pani nahi utha raha", "pump not priming", "pani nahi nikalta", "foot valve leak"],
    keywords: ["पंप", "पानी", "उठा", "प्राइमिंग", "फुट वाल्व", "लीक", "pump", "prime"],
    answerHi: "पंप में हवा (वैक्यूम लीक) आ जाने या फुट वाल्व में कचरा फंसने से पानी नहीं उठता। पंप के ऊपर लगे ढक्कन से पूरा पानी भरकर एयर निकालें (प्राइमिंग करें) और सक्शन पाइप के जोड़ का एयर लीकेज चेक करें।",
    answerEn: "Loss of pump priming due to leaking foot valve or suction pipe air ingress. Refill pump casing with water completely and check suction joints.",
    steps: [
      "पंप की ऊपरी फनल से तब तक पानी डालें जब तक कि बुलबुले आने बंद न हो जाएं।",
      "सक्शन पाइप के धागे/रबड़ वाशर पर ग्रीस या टेफ्लॉन टेप लगाकर कसें।",
      "कुएं या बोरिंग में नीचे लगे फुट वाल्व को बाहर निकालकर देखें कि कोई कंकड़ या पॉलीथीन तो नहीं फंसा।"
    ],
    warning: "बिना पानी भरे पंप को 1 मिनट से ज्यादा सूखा न चलाएं, वर्ना मैकेनिकल कार्बन सील जलकर नष्ट हो जाएगी।",
    mechanicRequired: false
  },
  {
    id: "pump_motor_01",
    category: "pump",
    categoryHi: "सिंचाई पंप - मोटर ट्रिप",
    questionHi: "सबमर्सिबल मोटर स्टार्ट करते ही स्टार्टर या MCB तुरंत ट्रिप हो जाता है, क्या खराबी है?",
    questionEn: "Submersible motor trips the starter or MCB immediately upon starting, what is wrong?",
    aliases: ["मोटर ट्रिप हो जाती है", "starter trip", "mcb trip", "motor nahi chal rahi", "submersible trip"],
    keywords: ["मोटर", "सबमर्सिबल", "ट्रिप", "MCB", "स्टार्टर", "कैपेसिटर", "शॉर्ट", "trip"],
    answerHi: "यह मुख्य रूप से तीन कारणों से होता है: 1. स्टार्टर का रनिंग या स्टार्टिंग कैपेसिटर फट गया है। 2. मोटर की वाइंडिंग में शॉर्ट सर्किट (अर्थ फॉल्ट) है। 3. बोरवेल में बालू आने से पंप का इंपेलर जाम हो गया है।",
    answerEn: "Starter tripping indicates a burnt capacitor, motor winding earth fault, or pump impeller jammed with sand/silt in the borewell.",
    steps: [
      "स्टार्टर बॉक्स खोलकर सूंघें; अगर जलने की बदबू आ रही है तो कैपेसिटर बदलें।",
      "मल्टीमीटर से तीनों फेज़ के तारों का अर्थिंग (बॉडी) रेजिस्टेंस चेक करें।",
      "अगर केबल सही है और कैपेसिटर नया है, तो पंप जाम हो सकता है, मैकेनिक से मोटर निकलवाएं।"
    ],
    warning: "गीले हाथों से स्टार्टर को कभी न छुएं और मेन स्विच काटकर ही जांच करें।",
    mechanicRequired: true
  },
  {
    id: "pump_noise_01",
    category: "pump",
    categoryHi: "सिंचाई पंप - आवाज",
    questionHi: "मोनोब्लॉक पंप से बहुत तेज घड़-घड़ की आवाज आ रही है और पंप बहुत गर्म हो रहा है, क्या करें?",
    questionEn: "Monoblock pump produces loud grinding noise and body overheats, what to do?",
    aliases: ["पंप से घड़ घड़ आवाज", "pump bearing noise", "pump garam ho raha hai", "bearing toot gaya"],
    keywords: ["पंप", "आवाज", "घड़-घड़", "बेयरिंग", "गर्म", "bearing"],
    answerHi: "यह पंप के बेयरिंग सूख जाने या टूट जाने के कारण होता है। जब पानी ग्लैंड पैकिंग से लीक होकर बेयरिंग में चला जाता है तो ग्रीस धुल जाती है और बेयरिंग कट जाता है। तुरंत पंप बंद करें और दोनों बेयरिंग (6204/6205) बदलवाएं।",
    answerEn: "Worn or water-contaminated ball bearings cause grinding vibration and overheating. Replace pump bearings immediately.",
    steps: [
      "पंप को बिजली से बंद करें।",
      "हाथ से पंखे की पुली को घुमाकर देखें; अगर बहुत जाम या खुरदुरा घूमे तो बेयरिंग खराब है।",
      "ग्लैंड डोरी और बेयरिंग सेट बदलवाएं।"
    ],
    mechanicRequired: true
  },

  // =========================================================================
  // 4. SPRAYERS - BATTERY & POWER (स्प्रेयर मशीन)
  // =========================================================================
  {
    id: "sp_press_01",
    category: "sprayer",
    categoryHi: "स्प्रेयर - प्रेशर न बनना",
    questionHi: "बैटरी स्प्रेयर की मोटर की आवाज आ रही है लेकिन नोजल से फव्वारा (प्रेशर) नहीं निकल रहा, क्या करें?",
    questionEn: "Battery sprayer motor is humming but no spray mist comes from nozzle, what to do?",
    aliases: ["स्प्रेयर प्रेशर नहीं बना रहा", "sprayer no pressure", "dawa nahi nikal rahi", "nozzle choked"],
    keywords: ["स्प्रेयर", "प्रेशर", "फव्वारा", "नोजल", "मोटर", "दवा", "sprayer"],
    answerHi: "90% मामलों में नोजल के बारीक छेद में कीटनाशक दवा का पाउडर या कचरा फंस जाता है। नोजल को खोलकर साफ पानी में धोएं और बारीक सुई से छेद साफ करें। टंकी के पेंदे में लगी जाली भी साफ करें।",
    answerEn: "Choked nozzle orifice from pesticide residue or blocked tank bottom suction filter. Unscrew nozzle and clean with fine pin.",
    steps: [
      "गन के आगे लगी पीतल या प्लास्टिक की नोजल को एंटी-क्लॉकवाइज खोलें।",
      "नोजल को मुंह से फूंकने के बजाय बारीक तार या टूथपिक से साफ करें।",
      "टंकी के अंदर नीचे लगी छोटी फिल्टर जाली निकालकर धोएं।"
    ],
    warning: "कीटनाशक वाली नोजल को कभी भी मुंह से फूंक मारकर साफ न करें, जहर का खतरा हो सकता है।",
    mechanicRequired: false
  },
  {
    id: "sp_bat_01",
    category: "sprayer",
    categoryHi: "स्प्रेयर - बैटरी",
    questionHi: "स्प्रेयर की बैटरी 1 या 2 टंकी दवा छिड़कने के बाद ही बैठ जाती है, इसका क्या उपाय है?",
    questionEn: "Sprayer 12V battery drains out after spraying just 1-2 tanks, what is the fix?",
    aliases: ["बैटरी जल्दी खत्म हो जाती है", "sprayer battery dead", "battery backup kam hai", "battery charge nahi hoti"],
    keywords: ["स्प्रेयर", "बैटरी", "बैकअप", "चार्ज", "12V", "battery"],
    answerHi: "12 वोल्ट 8Ah/12Ah लेड एसिड बैटरी की लाइफ 1 से 2 साल होती है। यदि चार्जर लगाने पर 15 मिनट में ही हरी बत्ती जल जाए तो बैटरी की प्लेटें सल्फेट हो चुकी हैं। चार्जर का आउटपुट वोल्टेज (लगभग 14V) चेक करें और नई बैटरी लगाएं।",
    answerEn: "12V lead-acid battery capacity degrades over time due to sulfation. Verify charger output voltage, or replace the 12V 8Ah/12Ah battery.",
    steps: [
      "चार्जर लगाकर कम से कम 6 से 8 घंटे तक पूरी रात चार्ज करें।",
      "छिड़काव सीजन खत्म होने के बाद भी महीने में एक बार बैटरी जरूर चार्ज करें ताकि वह खराब न हो।"
    ],
    mechanicRequired: false
  },

  // =========================================================================
  // 5. ROTAVATOR & IMPLEMENTS (रोटावेटर व जुताई उपकरण)
  // =========================================================================
  {
    id: "rot_pin_01",
    category: "rotavator",
    categoryHi: "रोटावेटर - शियर बोल्ट",
    questionHi: "खेत में जुताई करते समय रोटावेटर की पीटीओ शाफ्ट की पिन (बोल्ट) बार-बार टूट जाती है, क्यों?",
    questionEn: "Why does the rotavator PTO shear pin/bolt break repeatedly during field tilling?",
    aliases: ["रोटावेटर की पिन टूट जाती है", "shear bolt tootta hai", "pto pin break", "rotavator bolt tootta hai"],
    keywords: ["रोटावेटर", "शियर बोल्ट", "पिन", "टूट", "पीटीओ", "pto", "shear pin"],
    answerHi: "शियर बोल्ट ट्रैक्टर के गियरबॉक्स को टूटने से बचाने के लिए एक सेफ्टी पिन होती है। अगर मिट्टी में पत्थर या जड़ें हैं, या आप बहुत कड़ा स्टील बोल्ट (हाई टेंसिल) लगाने के बजाय सादा बोल्ट लगा रहे हैं, तो वह टूटेगा। सही ग्रेड (8.8) का शियर बोल्ट लगाएं।",
    answerEn: "Shear bolt breaks to protect tractor gearbox when encountering rocks or deep compaction. Use genuine grade 8.8 shear bolts and avoid sudden PTO clutch release.",
    steps: [
      "जुताई करते समय ट्रैक्टर को अचानक गड्ढे या पत्थर वाली मिट्टी में तेज गति से न डालें।",
      "पीटीओ का क्लच धीरे-धीरे छोड़ें ताकि झटका न लगे।",
      "लोकल तार या सरिया का टुकड़ा बोल्ट की जगह कभी न लगाएं, वर्ना ट्रैक्टर का पीटीओ शाफ्ट टूट जाएगा।"
    ],
    mechanicRequired: false
  },
  {
    id: "rot_gear_01",
    category: "rotavator",
    categoryHi: "रोटावेटर - गियरबॉक्स",
    questionHi: "रोटावेटर के साइड गियर बॉक्स से बहुत तेज घिसने की आवाज आ रही है, क्या जांच करें?",
    questionEn: "Rotavator side drive gearbox produces loud grinding whining noise, what to check?",
    aliases: ["रोटावेटर से आवाज", "side gear aawaz", "rotavator gear oil", "crown pinion"],
    keywords: ["रोटावेटर", "साइड गियर", "गियर ऑयल", "आवाज", "चैन"],
    answerHi: "साइड गियर बॉक्स में 140 नंबर गियर ऑयल कम हो गया है या साइड ड्राइव का बेयरिंग/आइडलर गियर कट गया है। साइड कवर का निचला ऑयल लेवल नट खोलकर चेक करें कि ऑयल लेवल तक है या नहीं।",
    answerEn: "Check side gear drive oil level (SAE 140). Low oil or worn idler gear/bearing causes heavy grinding sound.",
    steps: [
      "रोटावेटर को समतल जमीन पर खड़ा करें।",
      "साइड गियरबॉक्स का ऑयल लेवल प्लग खोलें; कम से कम 3 से 4 लीटर 140 नंबर गियर ऑयल होना चाहिए।",
      "अगर ऑयल में लोहे का बुरादा दिखे तो तुरंत गियर व बेयरिंग बदलवाएं।"
    ],
    mechanicRequired: true
  },

  // =========================================================================
  // 6. HARVESTER & THRESHER (हार्वेस्टर व थ्रेशर)
  // =========================================================================
  {
    id: "harv_choke_01",
    category: "harvester",
    categoryHi: "हार्वेस्टर/थ्रेशर - ड्रम चोक",
    questionHi: "गीली फसल या ज्यादा माल डालने पर थ्रेशर का ड्रम जाम हो जाता है और ट्रैक्टर का धुआं निकलने लगता है, क्या करें?",
    questionEn: "Thresher drum chokes on wet crop/heavy feeding and tractor bogs down with black smoke, what to do?",
    aliases: ["थ्रेशर जाम हो गया", "drum choke", "thresher jam", "maal phas gaya", "tractor baith gaya"],
    keywords: ["थ्रेशर", "ड्रम", "चोक", "जाम", "गीली फसल", "बेल्ट"],
    answerHi: "तुरंत ट्रैक्टर का पीटीओ गियर न्यूट्रल करें और इंजन बंद करें। थ्रेशर का इंस्पेक्शन कवर खोलें और फंसे हुए पुआल/फसल को हाथ से या लकड़ी के डंडे से उल्टा घुमाकर बाहर निकालें। कभी भी चालू ट्रैक्टर में हाथ न डालें।",
    answerEn: "Immediately disengage PTO and stop engine. Open the thresher concaves/inspection cover and manually clear jammed straw by reversing drum.",
    steps: [
      "ट्रैक्टर की चाबी निकाल लें ताकि कोई गलती से स्टार्ट न कर दे।",
      "थ्रेशर पुली को हाथ से उल्टी दिशा में घुमाते हुए ड्रम से फंसा पुआल बाहर खींचें।",
      "थ्रेशर के कंकेव (जाली) का गैप फसल के हिसाब से थोड़ा बढ़ाएं।"
    ],
    warning: "चलते हुए थ्रेशर या हार्वेस्टर में हाथ या पैर से पुआल धकेलने की गलती जानलेवा हो सकती है।",
    mechanicRequired: false
  },

  // =========================================================================
  // 7. ELECTRICAL & BATTERY (इलेक्ट्रिकल व बैटरी)
  // =========================================================================
  {
    id: "elec_alt_01",
    category: "electrical",
    categoryHi: "इलेक्ट्रिकल - चार्जिंग",
    questionHi: "ट्रैक्टर चलने के बाद भी बैटरी चार्ज नहीं होती और डैशबोर्ड पर बैटरी बत्ती जलती रहती है, क्यों?",
    questionEn: "Battery does not charge even after running tractor and battery light stays on, why?",
    aliases: ["बैटरी चार्ज नहीं हो रही", "dynamo nahi charge kar raha", "alternator light on", "battery light"],
    keywords: ["अल्टरनेटर", "डायनमो", "चार्जिंग", "बैटरी बत्ती", "बेल्ट ढीली", "alternator"],
    answerHi: "यह अल्टरनेटर की फैन बेल्ट ढीली होने, अल्टरनेटर के कार्बन ब्रश घिस जाने या डायोड प्लेट कटने से होता है। पहले चेक करें कि फैन बेल्ट टाइट घूम रही है। यदि बेल्ट सही है तो अल्टरनेटर का रेगुलेटर चेक करवाएं।",
    answerEn: "Loose alternator fan belt, worn carbon brushes, or blown internal regulator causes charging failure indicated by the battery warning light.",
    steps: [
      "फैन बेल्ट को दबाकर देखें, यदि बेल्ट ढीली है तो अल्टरनेटर का माउंटिंग बोल्ट ढीला करके टाइट करें।",
      "मल्टीमीटर से बैटरी के खूंटों पर वोल्टेज नापें; ट्रैक्टर स्टार्ट होने पर वोल्टेज 13.8V से 14.4V होना चाहिए।"
    ],
    mechanicRequired: true
  },

  // =========================================================================
  // 8. GENERAL MAINTENANCE & SEASONS (सामान्य रख-रखाव व सीजनल केयर)
  // =========================================================================
  {
    id: "maint_oil_01",
    category: "maintenance",
    categoryHi: "रख-रखाव - इंजन ऑयल",
    questionHi: "ट्रैक्टर का इंजन ऑयल कितने घंटे चलने के बाद बदलना चाहिए और कौन सा ग्रेड डालें?",
    questionEn: "After how many hours should tractor engine oil be changed and what grade to use?",
    aliases: ["इंजन ऑयल कब बदलें", "mobil kitne ghante par badle", "oil change hours", "15W40", "tractor service interval"],
    keywords: ["इंजन ऑयल", "घंटे", "बदलें", "15W-40", "सर्विस", "मोबिल", "oil change"],
    answerHi: "ट्रैक्टर का इंजन ऑयल हर 250 से 300 घंटे चलने के बाद या साल में कम से कम एक बार जरूर बदलना चाहिए। हमेशा 15W-40 CI-4 ग्रेड का असली इंजन ऑयल ही डालें और ऑयल के साथ इंजन ऑयल फिल्टर भी अनिवार्य रूप से बदलें।",
    answerEn: "Change tractor engine oil every 250 to 300 operating hours or once a year using 15W-40 CI-4 grade along with a new genuine oil filter.",
    steps: [
      "इंजन गर्म होने पर ऑयल ड्रेन प्लग खोलें ताकि सारा गंदा मोबिल आसानी से बह जाए।",
      "नया ऑयल फिल्टर लगाते समय उसकी रबड़ रिंग पर थोड़ा नया ऑयल लगाएं।",
      "इंजन में सही मात्रा (आमतौर पर 7.5 से 9.5 लीटर) में ऑयल डालें और गेज चेक करें।"
    ],
    mechanicRequired: false
  },
  {
    id: "maint_diesel_01",
    category: "maintenance",
    categoryHi: "रख-रखाव - डीजल सिस्टम",
    questionHi: "डीजल फिल्टर बदलने के बाद ट्रैक्टर स्टार्ट नहीं हो रहा, एयर ब्लीडिंग कैसे करें?",
    questionEn: "After replacing diesel filters tractor won't start, how to bleed the air?",
    aliases: ["डीजल फिल्टर बदलने के बाद स्टार्ट नहीं", "air bleeding kaise kare", "filter change starting", "diesel air lock"],
    keywords: ["डीजल फिल्टर", "एयर ब्लीडिंग", "हवा निकालना", "फीड पंप", "bleeding"],
    answerHi: "नया फिल्टर सूखा होने से पूरी लाइन में हवा भर जाती है। प्राइमरी और सेकेंडरी फिल्टर के ब्लीडर स्क्रू खोलें। फीड पंप को तब तक दबाएं जब तक कि बिना बुलबुले का धारदार डीजल न बहे। फिर नोजल पाइप खोलकर एक सेल्फ लगाएं।",
    answerEn: "New dry filters cause fuel airlock. Loosen filter bleed screws and pump hand primer until solid diesel flows, then tighten.",
    steps: [
      "प्राइमरी फिल्टर का ऊपर का 10 नंबर बोल्ट ढीला करें और फीड पंप से डीजल भरें।",
      "सेकेंडरी फिल्टर का बोल्ट ढीला करके हवा निकालें।",
      "इंजेक्टर के ऊपर लगे 17 नंबर लोहे के पाइप को हल्का ढीला करके एक सेल्फ लगाएं जब तक डीजल न फुआरे।",
      "पाइप टाइट करें और ट्रैक्टर तुरंत स्टार्ट हो जाएगा।"
    ],
    mechanicRequired: false
  },

  // =========================================================================
  // 9. AGRIPULSE APP & MECHANIC BOOKING (AgriPulse ऐप व बुकिंग)
  // =========================================================================
  {
    id: "app_book_01",
    category: "app",
    categoryHi: "AgriPulse - मैकेनिक सहायता",
    questionHi: "AgriPulse ऐप पर नजदीकी प्रमाणित मैकेनिक कैसे बुलाएं?",
    questionEn: "How to book a verified tractor/equipment mechanic on AgriPulse app?",
    aliases: ["मैकेनिक कैसे बुलाएं", "mistri kaise bulaye", "mechanic booking", "repair request kaise kare", "mistri chahiye"],
    keywords: ["मैकेनिक", "बुलाएं", "मिस्त्री", "बुकिंग", "AgriPulse", "अनुरोध", "mechanic"],
    answerHi: "AgriPulse ऐप पर होम स्क्रीन पर 'खराबी दर्ज करें' बटन दबाएं। अपनी मशीन चुनें, समस्या बोलकर या लिखकर बताएं, और 'अनुरोध भेजें'। सिस्टम तुरंत आपके 5 से 10 किलोमीटर के दायरे में मौजूद सबसे योग्य और प्रमाणित मिस्त्री को सूचना भेज देगा।",
    answerEn: "Tap 'Report Breakdown' on home screen, select machine, speak or type your problem, and submit. AgriPulse instantly matches the nearest verified technician.",
    steps: [
      "होम स्क्रीन पर 'खराबी दर्ज करें (Report Breakdown)' पर टैप करें।",
      "अपनी मशीन (ट्रैक्टर, पंप, टिलर) चुनें।",
      "माइक बटन दबाकर समस्या बोलें या फोटो खींचकर अपलोड करें।",
      "AI जांच देखकर 'मैकेनिक खोजें' पर क्लिक करें। मैकेनिक सीधे आपके खेत या घर पहुंचेगा।"
    ],
    mechanicRequired: false
  },
  {
    id: "app_price_01",
    category: "app",
    categoryHi: "AgriPulse - पारदर्शी शुल्क",
    questionHi: "AgriPulse पर मैकेनिक की विजिट फीस और मजदूरी कितनी होती है?",
    questionEn: "What is the visit fee and labor charge for mechanics on AgriPulse?",
    aliases: ["कितना पैसा लगेगा", "visit fees kitni hai", "labour charge", "charges kitne hain", "commission kitna hai"],
    keywords: ["फीस", "शुल्क", "पैसा", "चार्ज", "कमीशन", "price", "cost"],
    answerHi: "AgriPulse पूरी तरह पारदर्शी और शून्य-कमीशन मॉडल पर काम करता है। मानक विजिट व प्रारंभिक जांच शुल्क ₹150 से ₹200 होता है, और साधारण काम के लिए मजदूरी ₹200 से ₹400 के बीच होती है। काम पूरा होने के बाद ही किसान पुष्टि पर भुगतान करता है।",
    answerEn: "AgriPulse operates on zero platform commission. Standard visit fee is ₹150-200 and typical labor charge is ₹200-400 depending on the job.",
    steps: [
      "काम शुरू होने से पहले जॉब कार्ड पर अनुमानित लागत दिखाई जाती है।",
      "बिना आपकी अनुमति के कोई अतिरिक्त शुल्क नहीं जोड़ा जा सकता।",
      "भुगतान काम पूरा होने और संतुष्ट होने पर सीधे मिस्त्री को नकद या UPI से करें।"
    ],
    mechanicRequired: false
  }
];
