import { searchKnowledgeBase } from "../services/knowledgeBaseService";

const testQueries = [
  "OTP कहाँ डालना है?",
  "मेरी ट्रैक्टर की मशीन स्टार्ट नहीं हो रही।",
  "टेक्नीशियन कैसे मिलेगा?",
  "मेरी भाषा कैसे बदलूं?",
  "चांद पर रॉकेट कैसे भेजें?" // off-topic / not found test
];

console.log("=== Testing 1000 Q&A Knowledge Base Voice Responses ===\n");

for (const q of testQueries) {
  const result = searchKnowledgeBase(q);
  console.log(`Q: "${q}"`);
  console.log(`Matched Topic: ${result.entry.questionHi}`);
  console.log(`Category: ${result.entry.categoryHi}`);
  console.log(`Spoken Answer (Hindi): "${result.spokenResponseHi}"`);
  console.log(`Score: ${result.score}, MatchType: ${result.matchType}`);
  console.log("--------------------------------------------------\n");
}
