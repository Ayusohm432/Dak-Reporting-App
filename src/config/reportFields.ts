/**
 * Phase 9 form configuration.
 * Labels follow the Hindi column headings in DAK-Reporting Format(Blank).xlsx.
 * IDs are stable app keys; Phase 10 Excel export will map these IDs to columns.
 */
export type FieldType = "text" | "number" | "textarea" | "date" | "yesNo" | "select" | "multiSelect";

export interface ReportField {
  id: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: string[];
  placeholder?: string;
  visibleWhen?: { fieldId: string; equals: string };
}

export interface ReportSection {
  id: string;
  title: string;
  description: string;
  fields: ReportField[];
}

const yesNo = ["Yes", "No"];

export const REPORT_SECTIONS: ReportSection[] = [
  {
    id: "basic",
    title: "मूल विवरण एवं मामलों का विवरण",
    description: "DAK की मूल जानकारी और इस प्रतिवेदन अवधि के मामलों का विवरण भरें।",
    fields: [
      { id: "district", label: "ज़िला", type: "text", required: true },
      { id: "block", label: "प्रखंड", type: "text", required: true },
      { id: "coordinatorName", label: "DAK कोऑर्डिनेटर का नाम", type: "text", required: true },
      { id: "dakCasesReceived", label: "DAK पर आये मामलों की सं", type: "number" },
      { id: "dakCasesResolved", label: "इन मामलों में से कितने मामलों को सुलझा लिया गया ?", type: "number" },
      { id: "socialRightsCases", label: "26 से 25 तक आये सामाजिक अधिकार के मामलों की संख्या ?", type: "number" },
      { id: "socialRightsResolved", label: "इन मामलों में से कितने मामलों को सुलझाया गया ?", type: "number" },
      { id: "helplineRegistrationsTransfers", label: "मामलों का टोल फ्री सहायता सेवा में निबंधन और मामलों का सहायक संस्थाओं में स्थानान्तरण", type: "number" },
      { id: "oneStopCentreReferrals", label: "कितने मामलों को वन-स्टॉप सेंटर रेफ़र किया गया ?", type: "number" },
      { id: "womenPoliceReferrals", label: "कितने मामलों को महिला-थाना रेफ़र किया गया ?", type: "number" },
      { id: "calls112181", label: "112/181 पर किये गए कॉल की संख्या", type: "number" },
      { id: "calls1098", label: "1098 पर किये गए कॉल की संख्या", type: "number" },
      { id: "cmReferredCases", label: "कितने मामलों को CM द्वारा DAK पर भेजा गया ?", type: "number" },
    ],
  },
  {
    id: "reviewMeeting",
    title: "DAK का रिव्यु मीटिंग (समीक्षात्मक बैठक)",
    description: "समीक्षात्मक बैठक से संबंधित जानकारी भरें।",
    fields: [
      { id: "reviewMeetingHeld", label: "DAK का रिव्यु मीटिंग (समीक्षात्मक बैठक)", type: "select", options: ["0", "1"] },
      { id: "reviewMeetingDate", label: "तिथि", type: "date", placeholder: "DD/MM/YYYY" },
      { id: "reviewMeetingNumber", label: "इस समीक्षात्मक बैठक की संख्या क्या है? (पहली बार के लिए 1, दूसरी बार के लिए 2...)", type: "number" },
      { id: "meetingChairperson", label: "किसकी अध्यक्षता में ये समीक्षात्मक बैठक हुआ है? (लीडर, CC, RC-C3, BPM, DAK-C, अन्य)", type: "multiSelect", options: ["लीडर", "CC", "RC-C3", "BPM", "DAK-C", "अन्य"] },
      { id: "coordinatorAttended", label: "क्या DAK कोऑर्डिनेटर ने इस समीक्षात्मक बैठक में भाग लिया?", type: "select", options: yesNo },
      { id: "sakhamaPresent", label: "इस समीक्षात्मक बैठक में कितनी सक्षमा उपस्थित थी?", type: "number" },
      { id: "totalParticipants", label: "कुल उपस्थित प्रतिभागियों की संख्या", type: "number" },
    ],
  },
  {
    id: "genderFund",
    title: "जेंडर फण्ड",
    description: "जेंडर फण्ड से संबंधित विवरण भरें।",
    fields: [
      { id: "genderFund", label: "जेंडर फण्ड", type: "number" },
      { id: "genderFundAmount", label: "अभी तक कुल कितना फण्ड संकलित हुआ है ?", type: "number" },
      { id: "genderFundLetterIssued", label: "BPIU द्वारा जेंडर फण्ड केलिए पत्र निर्गत हुआ है ?", type: "select", options: yesNo },
    ],
  },
  {
    id: "bodRgbCm",
    title: "BOD/RGB/CM बैठक",
    description: "बैठकों की स्थिति दर्ज करें।",
    fields: [
      { id: "bodRgbCmMeeting", label: "BOD/RGB/CM बैठक", type: "select", options: yesNo },
      { id: "rgbMeetingHeld", label: "इस माह RGB की बैठक हुई?", type: "select", options: yesNo },
      { id: "cmGppMeetingHeld", label: "इस माह CM/GPP की बैठक हुई?", type: "select", options: yesNo },
    ],
  },
  {
    id: "genderCrp",
    title: "जेंडर CRP द्वारा भ्रमण",
    description: "जेंडर CRP के भ्रमण और चर्चा का विवरण भरें।",
    fields: [
      { id: "genderCrpVisits", label: "जेंडर CRP द्वारा भ्रमण", type: "number" },
      { id: "shgVisits", label: "जेंडर-CRP द्वारा कितने SHG का भ्रमण किया गया ?", type: "number" },
      { id: "womenPanchayatRepresentativesMet", label: "जेंडर-CRP द्वारा कितनी महिला पंचायत प्रतिनिधियों से भेंट किया गया ?", type: "number" },
      { id: "menPanchayatRepresentativesMet", label: "जेंडर-CRP द्वारा कितनी पुरुष पंचायत प्रतिनिधियों से भेंट किया गया ?", type: "number" },
      { id: "cmGenderDiscussions", label: "CM द्वारा जेंडर पर चर्चा", type: "number" },
    ],
  },
  {
    id: "blgf",
    title: "BLGF बैठक",
    description: "BLGF बैठक हुई हो तो तारीख और बैठक संख्या दर्ज करें।",
    fields: [
      { id: "blgfMeetingHeld", label: "BLGF बैठक", type: "select", options: yesNo },
      { id: "blgfMeetingDate", label: "अगर हाँ तो तारीख बताइए", type: "date", placeholder: "DD/MM/YYYY", visibleWhen: { fieldId: "blgfMeetingHeld", equals: "Yes" } },
      { id: "blgfMeetingNumber", label: "इस BLGF बैठक की संख्या क्या है?", type: "number", visibleWhen: { fieldId: "blgfMeetingHeld", equals: "Yes" } },
    ],
  },
  {
    id: "plgf",
    title: "PLGF बैठक",
    description: "PLGF बैठकों की संख्या दर्ज करें। AL में दी गई संख्या के अनुसार नीचे पंचायत/तिथि की प्रविष्टियाँ बनेंगी।",
    fields: [
      { id: "plgfMeeting", label: "PLGF बैठक", type: "number" },
      { id: "plgfFormedCount", label: "इस माह कुल कितने PLGF का गठन किया गया ?", type: "number" },
      { id: "plgfMeetingCount", label: "इस माह कुल PLGF बैठकों की संख्या कितनी है ?", type: "number" },
      { id: "plgfMeetingNumber", label: "इस PLGF मीटिंग की संख्या क्या है?", type: "number" },
      { id: "plgfWomenRepresentatives", label: "PLGF में कितनी महिला जन-प्रतिनिधियों ने भाग लिया ?", type: "number" },
      { id: "plgfMenRepresentatives", label: "PLGF में कितने पुरुष जन-प्रतिनिधियों ने भाग लिया ?", type: "number" },
      { id: "plgfWomenAttendees", label: "PLGF में कितनी महिलाओं ने भाग लिया ?", type: "number" },
      { id: "plgfMenAttendees", label: "PLGF में कितने पुरुषों ने भाग लिया ?", type: "number" },
    ],
  },
  {
    id: "safety",
    title: "सेफ्टी ऑडिट",
    description: "AT में दी गई संख्या के अनुसार पंचायत/तिथि की प्रविष्टियाँ बनेंगी। मुद्दों को BA के लिए comma-separated रूप में दर्ज करें।",
    fields: [
      { id: "safetyAuditCount", label: "सेफ्टी ऑडिट", type: "number" },
      { id: "safetyWomenRepresentatives", label: "कितनी महिला जन-प्रतिनिधियों ने सेफ्टी ऑडिट में हिस्सा लिया ?", type: "number" },
      { id: "safetyMenRepresentatives", label: "कितने पुरुष जन-प्रतिनिधियों ने सेफ्टी ऑडिट में हिस्सा लिया ?", type: "number" },
      { id: "safetyWomenAttendees", label: "कितनी महिलाओं ने सेफ्टी ऑडिट में हिस्सा लिया ?", type: "number" },
      { id: "safetyMenAttendees", label: "कितने पुरुषों ने सेफ्टी ऑडिट में हिस्सा लिया ?", type: "number" },
      { id: "safetyAuditIssues", label: "साफ्टी ऑडिट में कौन कौन से मुद्दे निकल कर आये ?", type: "textarea", placeholder: "अलग-अलग मुद्दों को comma से अलग करें" },
      { id: "safetyIssuesActioned", label: "कितने जन-प्रतिनिधियों ने साफ्टी ऑडिट द्वारा पाए गए मुद्दों पर कार्य किया ?", type: "number" },
    ],
  },
  {
    id: "adolescent",
    title: "किशोरी समूह एवं बाल-विवाह",
    description: "BE में दी गई संख्या के अनुसार पंचायत/तिथि की प्रविष्टियाँ बनेंगी।",
    fields: [
      { id: "adolescentGroups", label: "किशोरी समूह एवं बाल-विवाह", type: "number" },
      { id: "totalAdolescentGirls", label: "इन समूहों में कुल किशोरियों की संख्या क्या है ?", type: "number" },
      { id: "adolescentMeetingCount", label: "इस माह किशोरी समूह बैठकों की सं", type: "number" },
      { id: "adolescentGirlsAttended", label: "बैठक में सम्मिलित किशोरियों की सं क्या है ?", type: "number" },
      { id: "childMarriagesPrevented", label: "कितना बाल-विवाह रोका गया ?", type: "number" },
      { id: "representativesHelpedPreventMarriage", label: "कितने जन-प्रतिनिधियों ने सक्रीय रूप से बाल-विवाह रोकने हेतु सहयोग किया ?", type: "number" },
    ],
  },
];
