/**
 * DEMO CONTENT. These are fictional, illustrative scenarios used when live news is not configured.
 * They are always flagged `isDemo: true`, carry no real article links, and the UI labels them
 * "Demo scenario: not real news". Background sections draw only on long-established reference
 * facts. Never present these as verified live reporting.
 */
import type { Category, Claim, Involved, NewsEvent, Quiz, QuizQuestion, Region, SourceRef } from "@/lib/types";
import { scoreImportance } from "@/lib/news/importance";

interface DemoSpec {
  id: string;
  title: string;
  category: Category;
  countries: string[];
  figures?: string[];
  location: [number, number]; // lat, lng
  region: Region;
  hoursAgo: number;
  signals: { outlets: number; articles: number; consequences: number; significance: number };
  whatHappened: Claim[];
  background: Claim[];
  involved: Involved[];
  whyItMatters: Claim[];
  whatNext: Claim[];
  questions: Omit<QuizQuestion, "id">[];
}

const F = (text: string): Claim => ({ text, kind: "fact" });
const P = (text: string): Claim => ({ text, kind: "prediction" });
const A = (text: string): Claim => ({ text, kind: "allegation" });
const D = (text: string): Claim => ({ text, kind: "disputed" });
const O = (text: string): Claim => ({ text, kind: "opinion" });

const SPECS: DemoSpec[] = [
  {
    id: "demo-ukraine-exchange",
    title: "Ukraine and Russia carry out a large prisoner exchange",
    category: "conflict",
    countries: ["UKR", "RUS", "ARE"],
    figures: ["volodymyr-zelenskyy", "vladimir-putin"],
    location: [50.45, 30.52],
    region: "Europe",
    hoursAgo: 5,
    signals: { outlets: 6, articles: 14, consequences: 0.8, significance: 0.8 },
    whatHappened: [
      F("In this demo scenario, Ukraine and Russia exchanged several hundred prisoners of war at the border with Belarus."),
      F("The United Arab Emirates acted as mediator, as it has for a number of earlier exchanges."),
      A("Each side accused the other of delaying the release of some wounded soldiers; neither claim could be independently confirmed."),
    ],
    background: [
      F("Russia launched its full-scale invasion of Ukraine in February 2022, the largest war in Europe since 1945."),
      F("Ukraine has been led by President Volodymyr Zelenskyy since 2019; Russia by President Vladimir Putin."),
      F("Prisoner exchanges have continued throughout the war even when broader peace talks stalled, often brokered by countries such as the UAE and Türkiye."),
    ],
    involved: [
      { name: "Ukraine", kind: "country", ref: "UKR", role: "Party to the exchange" },
      { name: "Russia", kind: "country", ref: "RUS", role: "Party to the exchange" },
      { name: "United Arab Emirates", kind: "country", ref: "ARE", role: "Mediator" },
      { name: "Volodymyr Zelenskyy", kind: "figure", ref: "volodymyr-zelenskyy", role: "President of Ukraine" },
      { name: "Vladimir Putin", kind: "figure", ref: "vladimir-putin", role: "President of Russia" },
    ],
    whyItMatters: [
      F("Exchanges are one of the few channels where the two governments still cooperate directly."),
      O("Some analysts see successful swaps as small confidence-building steps that can support wider negotiations."),
    ],
    whatNext: [
      F("Officials on both sides said lists for a further exchange were being prepared."),
      P("If the mediator remains involved, further swaps could follow within weeks, but timing is uncertain."),
    ],
    questions: [
      { type: "multiple_choice", prompt: "Which country mediated the exchange in this scenario?", choices: ["Türkiye", "United Arab Emirates", "Switzerland", "Qatar"], answerIndex: 1, explanation: "The briefing says the United Arab Emirates acted as mediator.", context: "Gulf states have positioned themselves as neutral go-betweens in this war.", evidence: "The United Arab Emirates acted as mediator" },
      { type: "figure_id", prompt: "Who is the President of Ukraine?", choices: ["Vladimir Putin", "Volodymyr Zelenskyy", "Yulia Svyrydenko", "Donald Tusk"], figureIds: ["vladimir-putin", "volodymyr-zelenskyy", "yulia-svyrydenko", "donald-tusk"], answerIndex: 1, explanation: "Volodymyr Zelenskyy has been Ukraine's president since 2019.", evidence: "Ukraine has been led by President Volodymyr Zelenskyy since 2019" },
      { type: "true_false", prompt: "True or false: the accusations about delayed releases were independently confirmed.", choices: ["True", "False"], answerIndex: 1, explanation: "False. The briefing labels them allegations that could not be independently confirmed.", context: "Separating allegations from facts is a key skill when following conflict news.", evidence: "neither claim could be independently confirmed" },
      { type: "map", prompt: "Find the country that launched a full-scale invasion of Ukraine in 2022.", choices: ["Belarus", "Russia", "Poland", "Romania"], countryIds: ["BLR", "RUS", "POL", "ROU"], answerIndex: 1, explanation: "Russia launched the full-scale invasion in February 2022.", evidence: "Russia launched its full-scale invasion of Ukraine in February 2022" },
    ],
  },
  {
    id: "demo-sudan-aid",
    title: "Aid agencies scale up famine response in Sudan",
    category: "humanitarian",
    countries: ["SDN", "TCD"],
    location: [13.6, 25.35],
    region: "Africa",
    hoursAgo: 9,
    signals: { outlets: 3, articles: 5, consequences: 0.7, significance: 1 },
    whatHappened: [
      F("In this demo scenario, UN agencies announced an expanded food-aid operation for areas of Darfur facing famine conditions."),
      F("Trucks are being routed through the Adre border crossing from neighbouring Chad."),
      D("The two warring sides dispute who is responsible for earlier blockages of aid routes."),
    ],
    background: [
      F("Sudan's war began in April 2023 between the Sudanese Armed Forces and the paramilitary Rapid Support Forces (RSF)."),
      F("The conflict has displaced millions of people, making it one of the world's largest displacement crises."),
      F("Chad, to the west, hosts hundreds of thousands of Sudanese refugees."),
    ],
    involved: [
      { name: "Sudan", kind: "country", ref: "SDN", role: "Country at war" },
      { name: "Chad", kind: "country", ref: "TCD", role: "Neighbour hosting refugees; aid route" },
      { name: "Sudanese Armed Forces", kind: "group", role: "Warring party" },
      { name: "Rapid Support Forces", kind: "group", role: "Warring party" },
      { name: "UN humanitarian agencies", kind: "organization", role: "Delivering aid" },
    ],
    whyItMatters: [
      F("Famine affects people long after fighting ends, through malnutrition, disease and lost harvests."),
      O("Humanitarian groups argue the crisis receives far less attention than its scale warrants."),
    ],
    whatNext: [
      F("Agencies said deliveries depend on both sides guaranteeing safe passage."),
      P("Without a ceasefire, access is likely to remain unpredictable during the rainy season."),
    ],
    questions: [
      { type: "multiple_choice", prompt: "When did Sudan's current war begin?", choices: ["January 2019", "April 2023", "March 2021", "October 2024"], answerIndex: 1, explanation: "The war began in April 2023.", evidence: "Sudan's war began in April 2023" },
      { type: "multiple_choice", prompt: "Which two forces are fighting the war?", choices: ["Sudanese Armed Forces and Rapid Support Forces", "Sudan and South Sudan", "Sudan and Chad", "Two rival UN missions"], answerIndex: 0, explanation: "The war is between the Sudanese Armed Forces and the paramilitary RSF.", evidence: "between the Sudanese Armed Forces and the paramilitary Rapid Support Forces (RSF)" },
      { type: "map", prompt: "Through which neighbouring country are aid trucks being routed?", choices: ["Egypt", "Chad", "Ethiopia", "Libya"], countryIds: ["EGY", "TCD", "ETH", "LBY"], answerIndex: 1, explanation: "Aid is routed through the Adre crossing from Chad.", evidence: "Adre border crossing from neighbouring Chad" },
      { type: "cause_effect", prompt: "According to the briefing, what do aid deliveries depend on?", choices: ["Higher oil prices", "Both sides guaranteeing safe passage", "A new UN Secretary-General", "The end of the rainy season only"], answerIndex: 1, explanation: "Agencies said deliveries depend on safe passage from both sides.", evidence: "deliveries depend on both sides guaranteeing safe passage" },
    ],
  },
  {
    id: "demo-malacca-shipping",
    title: "Strait of Malacca traffic slows after a container ship runs aground",
    category: "trade",
    countries: ["SGP", "MYS", "IDN"],
    location: [2.5, 101.4],
    region: "Asia",
    hoursAgo: 14,
    signals: { outlets: 4, articles: 7, consequences: 0.65, significance: 0.7 },
    whatHappened: [
      F("In this demo scenario, a large container ship ran aground in the Strait of Malacca, briefly narrowing the shipping lane."),
      F("Maritime authorities from Malaysia, Indonesia and Singapore coordinated salvage work."),
      F("No injuries or oil leaks were reported."),
    ],
    background: [
      F("The Strait of Malacca links the Indian Ocean with the South China Sea and the Pacific."),
      F("It is one of the world's busiest shipping chokepoints, carrying a large share of trade between Asia, the Middle East and Europe."),
      F("Singapore, at the southern end of the strait, is one of the world's largest container ports."),
    ],
    involved: [
      { name: "Singapore", kind: "country", ref: "SGP", role: "Port state at the southern end" },
      { name: "Malaysia", kind: "country", ref: "MYS", role: "Coastal state" },
      { name: "Indonesia", kind: "country", ref: "IDN", role: "Coastal state" },
    ],
    whyItMatters: [
      F("Even short delays at a chokepoint can ripple through supply chains and raise shipping costs."),
      O("Some trade economists say incidents like this show the risks of relying on a few narrow sea lanes."),
    ],
    whatNext: [
      F("Authorities said full traffic should resume once the ship is refloated."),
      P("Freight rates may tick up briefly if backlogs build at nearby ports."),
    ],
    questions: [
      { type: "multiple_choice", prompt: "Which two bodies of water does the Strait of Malacca link?", choices: ["The Red Sea and the Mediterranean", "The Indian Ocean and the South China Sea", "The Black Sea and the Aegean", "The Atlantic and the Pacific"], answerIndex: 1, explanation: "It links the Indian Ocean with the South China Sea and the Pacific.", evidence: "links the Indian Ocean with the South China Sea" },
      { type: "map", prompt: "Which highlighted country sits at the southern end of the strait and runs one of the world's largest container ports?", choices: ["Singapore", "Thailand", "Vietnam", "Philippines"], countryIds: ["SGP", "THA", "VNM", "PHL"], answerIndex: 0, explanation: "Singapore sits at the southern end of the Strait of Malacca.", evidence: "Singapore, at the southern end of the strait" },
      { type: "cause_effect", prompt: "Why can a short delay in the strait matter globally?", choices: ["It changes national borders", "Delays at a chokepoint ripple through supply chains", "It closes all airports in Asia", "It cancels trade agreements"], answerIndex: 1, explanation: "Chokepoints concentrate traffic, so delays spread through supply chains.", evidence: "Even short delays at a chokepoint can ripple through supply chains" },
    ],
  },
  {
    id: "demo-opec-meeting",
    title: "OPEC+ ministers agree to keep oil output unchanged",
    category: "energy",
    countries: ["SAU", "RUS", "ARE", "AUT"],
    figures: ["mohammed-bin-salman"],
    location: [24.71, 46.67],
    region: "Asia",
    hoursAgo: 20,
    signals: { outlets: 5, articles: 11, consequences: 0.75, significance: 0.8 },
    whatHappened: [
      F("In this demo scenario, OPEC+ energy ministers met online and agreed to keep production targets unchanged for the next quarter."),
      F("Oil prices moved little after the announcement."),
      O("Several delegates described the decision as 'cautious' given uncertain demand."),
    ],
    background: [
      F("OPEC was founded in 1960; OPEC+ is the wider group that includes Russia and other non-OPEC producers since 2016."),
      F("Saudi Arabia is OPEC's largest producer and plays a leading role in setting the group's policy."),
      F("OPEC's secretariat is headquartered in Vienna, Austria."),
    ],
    involved: [
      { name: "Saudi Arabia", kind: "country", ref: "SAU", role: "Leading OPEC producer" },
      { name: "Russia", kind: "country", ref: "RUS", role: "Leading non-OPEC member of OPEC+" },
      { name: "United Arab Emirates", kind: "country", ref: "ARE", role: "OPEC member" },
      { name: "OPEC", kind: "organization", role: "Producer group" },
    ],
    whyItMatters: [
      F("Oil prices affect fuel costs, inflation and the budgets of both importing and exporting countries."),
      P("Unchanged output suggests producers expect stable demand, though forecasts vary widely."),
    ],
    whatNext: [
      F("The group scheduled its next review meeting for the following quarter."),
      P("Analysts expect the group could adjust output if prices move sharply."),
    ],
    questions: [
      { type: "multiple_choice", prompt: "What is the main difference between OPEC and OPEC+?", choices: ["OPEC+ only includes African states", "OPEC+ adds Russia and other non-OPEC producers", "OPEC+ is a consumer group", "There is no difference"], answerIndex: 1, explanation: "OPEC+ includes Russia and other non-OPEC producers since 2016.", evidence: "OPEC+ is the wider group that includes Russia and other non-OPEC producers since 2016" },
      { type: "map", prompt: "Which country is OPEC's largest producer?", choices: ["Iraq", "Saudi Arabia", "Kuwait", "Oman"], countryIds: ["IRQ", "SAU", "KWT", "OMN"], answerIndex: 1, explanation: "Saudi Arabia is OPEC's largest producer.", evidence: "Saudi Arabia is OPEC's largest producer" },
      { type: "true_false", prompt: "True or false: OPEC's secretariat is in Vienna.", choices: ["True", "False"], answerIndex: 0, explanation: "True: it is headquartered in Vienna, Austria.", evidence: "headquartered in Vienna, Austria" },
      { type: "cause_effect", prompt: "Why do oil decisions matter to people far from oil fields?", choices: ["They change time zones", "They affect fuel costs, inflation and government budgets", "They decide elections directly", "They set exchange rates by law"], answerIndex: 1, explanation: "Oil prices feed into fuel costs, inflation and budgets.", evidence: "Oil prices affect fuel costs, inflation and the budgets" },
    ],
  },
  {
    id: "demo-unsc-reform",
    title: "UN General Assembly debates Security Council reform",
    category: "organizations",
    countries: ["USA"],
    figures: ["antonio-guterres"],
    location: [40.75, -73.97],
    region: "Americas",
    hoursAgo: 28,
    signals: { outlets: 3, articles: 4, consequences: 0.55, significance: 0.6 },
    whatHappened: [
      F("In this demo scenario, UN member states held a day of debate on expanding the Security Council."),
      F("Several African and Latin American delegations called for permanent seats for their regions."),
      O("Some delegates argued the current structure no longer reflects today's world."),
    ],
    background: [
      F("The Security Council has 15 members: five permanent members with veto power (China, France, Russia, the UK and the US) and ten elected for two-year terms."),
      F("The number of permanent seats has not changed since the UN was founded in 1945."),
      F("António Guterres has been UN Secretary-General since 2017; his second term ends at the end of 2026."),
    ],
    involved: [
      { name: "United Nations", kind: "organization", role: "Host of the debate" },
      { name: "António Guterres", kind: "figure", ref: "antonio-guterres", role: "UN Secretary-General" },
      { name: "African Union members", kind: "organization", role: "Seeking permanent seats" },
    ],
    whyItMatters: [
      F("Any of the five permanent members can veto Council resolutions, including on war and sanctions."),
      P("Reform requires amending the UN Charter, which is widely seen as difficult."),
    ],
    whatNext: [
      F("Negotiations continue in an intergovernmental process that meets throughout the year."),
      P("Observers expect no quick breakthrough."),
    ],
    questions: [
      { type: "multiple_choice", prompt: "How many members sit on the UN Security Council?", choices: ["5", "10", "15", "193"], answerIndex: 2, explanation: "15: five permanent and ten elected members.", evidence: "The Security Council has 15 members" },
      { type: "figure_id", prompt: "Who has been UN Secretary-General since 2017?", choices: ["Mark Rutte", "António Guterres", "Kristalina Georgieva", "António Costa"], figureIds: ["mark-rutte", "antonio-guterres", "kristalina-georgieva", "antonio-costa"], answerIndex: 1, explanation: "António Guterres has led the UN since 2017.", evidence: "António Guterres has been UN Secretary-General since 2017" },
      { type: "true_false", prompt: "True or false: new permanent seats have been added to the Council several times since 1945.", choices: ["True", "False"], answerIndex: 1, explanation: "False: the number of permanent seats has not changed since 1945.", evidence: "has not changed since the UN was founded in 1945" },
    ],
  },
  {
    id: "demo-ecb-rates",
    title: "European Central Bank holds interest rates steady",
    category: "economy",
    countries: ["DEU", "FRA", "ITA", "ESP"],
    location: [50.11, 8.68],
    region: "Europe",
    hoursAgo: 33,
    signals: { outlets: 5, articles: 9, consequences: 0.6, significance: 0.7 },
    whatHappened: [
      F("In this demo scenario, the European Central Bank (ECB) left its key interest rates unchanged."),
      F("The bank said inflation in the euro area was close to its 2% target."),
      P("The bank's statement suggested future decisions would depend on incoming data."),
    ],
    background: [
      F("The ECB sets monetary policy for the euro area, the group of EU countries that use the euro."),
      F("It is based in Frankfurt, Germany."),
      F("Central banks raise rates to cool inflation and cut them to support growth."),
    ],
    involved: [
      { name: "European Central Bank", kind: "organization", role: "Sets euro-area interest rates" },
      { name: "Germany", kind: "country", ref: "DEU", role: "Largest euro-area economy" },
      { name: "France", kind: "country", ref: "FRA", role: "Euro-area economy" },
      { name: "Italy", kind: "country", ref: "ITA", role: "Euro-area economy" },
    ],
    whyItMatters: [
      F("Interest rates affect mortgages, business loans and savings for hundreds of millions of people."),
      O("Some economists argue rates should fall faster to help weak growth; others warn about inflation returning."),
    ],
    whatNext: [
      F("The ECB's governing council meets roughly every six weeks."),
      P("Markets will watch inflation data for signs of the next move."),
    ],
    questions: [
      { type: "multiple_choice", prompt: "What inflation target does the briefing mention?", choices: ["0%", "2%", "5%", "10%"], answerIndex: 1, explanation: "The ECB aims for 2% inflation.", evidence: "close to its 2% target" },
      { type: "map", prompt: "In which country is the ECB based?", choices: ["France", "Germany", "Belgium", "Netherlands"], countryIds: ["FRA", "DEU", "BEL", "NLD"], answerIndex: 1, explanation: "The ECB is based in Frankfurt, Germany.", evidence: "It is based in Frankfurt, Germany" },
      { type: "cause_effect", prompt: "Central banks usually raise interest rates in order to…", choices: ["Cool inflation", "Increase unemployment on purpose", "Print more money", "Lower taxes"], answerIndex: 0, explanation: "Raising rates cools inflation; cutting rates supports growth.", evidence: "Central banks raise rates to cool inflation" },
    ],
  },
  {
    id: "demo-scs-standoff",
    title: "Coast guard standoff near a disputed South China Sea shoal",
    category: "security",
    countries: ["PHL", "CHN"],
    figures: ["ferdinand-marcos-jr", "xi-jinping"],
    location: [9.73, 115.87],
    region: "Asia",
    hoursAgo: 40,
    signals: { outlets: 5, articles: 8, consequences: 0.75, significance: 0.65 },
    whatHappened: [
      F("In this demo scenario, Philippine and Chinese coast guard vessels faced off near Second Thomas Shoal for several hours."),
      A("The Philippines said a Chinese vessel used a water cannon; China said its ships acted lawfully to expel an intruder."),
      F("No injuries were reported."),
    ],
    background: [
      F("China claims most of the South China Sea; the Philippines, Vietnam, Malaysia and Brunei have overlapping claims."),
      F("In 2016 an arbitral tribunal under the UN Convention on the Law of the Sea ruled against China's broad claims; China rejected the ruling."),
      F("The Philippines is a treaty ally of the United States."),
    ],
    involved: [
      { name: "Philippines", kind: "country", ref: "PHL", role: "Claimant state" },
      { name: "China", kind: "country", ref: "CHN", role: "Claimant state" },
      { name: "Ferdinand Marcos Jr.", kind: "figure", ref: "ferdinand-marcos-jr", role: "President of the Philippines" },
      { name: "United States", kind: "country", ref: "USA", role: "Treaty ally of the Philippines" },
    ],
    whyItMatters: [
      F("Trillions of dollars of trade pass through the South China Sea each year."),
      O("Security analysts warn that repeated close encounters raise the risk of an accident escalating."),
    ],
    whatNext: [
      F("The Philippines said it would lodge a diplomatic protest."),
      P("Similar encounters are likely to recur during resupply missions."),
    ],
    questions: [
      { type: "true_false", prompt: "True or false: the water-cannon claim is presented as confirmed fact.", choices: ["True", "False"], answerIndex: 1, explanation: "False: it is an allegation by the Philippines, which China disputes.", evidence: "The Philippines said a Chinese vessel used a water cannon" },
      { type: "multiple_choice", prompt: "What did the 2016 arbitral tribunal decide?", choices: ["It upheld China's broad claims", "It ruled against China's broad claims", "It gave the shoal to Vietnam", "It made no ruling"], answerIndex: 1, explanation: "The tribunal ruled against China's broad claims; China rejected the ruling.", evidence: "ruled against China's broad claims" },
      { type: "figure_id", prompt: "Who is the President of the Philippines?", choices: ["Prabowo Subianto", "Ferdinand Marcos Jr.", "Tô Lâm", "Anthony Albanese"], figureIds: ["prabowo-subianto", "ferdinand-marcos-jr", "to-lam", "anthony-albanese"], answerIndex: 1, explanation: "Ferdinand Marcos Jr. has been president since 2022.", evidence: "Ferdinand Marcos Jr." },
      { type: "map", prompt: "Which of these countries also has claims in the South China Sea?", choices: ["Thailand", "Vietnam", "Japan", "Cambodia"], countryIds: ["THA", "VNM", "JPN", "KHM"], answerIndex: 1, explanation: "Vietnam is among the claimants listed.", evidence: "the Philippines, Vietnam, Malaysia and Brunei have overlapping claims" },
    ],
  },
  {
    id: "demo-ai-seoul",
    title: "Governments meet in Seoul to coordinate AI safety testing",
    category: "technology",
    countries: ["KOR", "GBR", "USA", "JPN"],
    figures: ["lee-jae-myung"],
    location: [37.57, 126.98],
    region: "Asia",
    hoursAgo: 52,
    signals: { outlets: 3, articles: 4, consequences: 0.5, significance: 0.45 },
    whatHappened: [
      F("In this demo scenario, officials from about 20 governments met in Seoul to share methods for testing advanced AI systems."),
      F("Participants agreed to exchange evaluation results between national AI safety institutes."),
      O("Industry groups welcomed the meeting but warned against rules that could slow innovation."),
    ],
    background: [
      F("The UK hosted the first global AI Safety Summit at Bletchley Park in 2023; South Korea co-hosted a follow-up in Seoul in 2024."),
      F("Several countries, including the UK, the US and Japan, have set up government bodies to evaluate AI models."),
    ],
    involved: [
      { name: "South Korea", kind: "country", ref: "KOR", role: "Host" },
      { name: "United Kingdom", kind: "country", ref: "GBR", role: "Participant" },
      { name: "United States", kind: "country", ref: "USA", role: "Participant" },
      { name: "Japan", kind: "country", ref: "JPN", role: "Participant" },
    ],
    whyItMatters: [
      F("AI is increasingly treated as a matter of economic competition and national security."),
      P("Shared testing standards could make it easier for companies to operate across borders."),
    ],
    whatNext: [
      P("Participants may publish a joint report on evaluation methods later in the year."),
    ],
    questions: [
      { type: "multiple_choice", prompt: "Where was the first global AI Safety Summit held in 2023?", choices: ["Seoul", "Bletchley Park, UK", "Geneva", "Tokyo"], answerIndex: 1, explanation: "The UK hosted it at Bletchley Park in 2023.", evidence: "Bletchley Park in 2023" },
      { type: "multiple_choice", prompt: "What did participants agree to do in this scenario?", choices: ["Ban all AI research", "Exchange evaluation results between AI safety institutes", "Create a single world AI company", "Tax AI chips"], answerIndex: 1, explanation: "They agreed to exchange evaluation results.", evidence: "agreed to exchange evaluation results" },
      { type: "country_id", prompt: "Which silhouette shows the country that hosted this meeting?", choices: ["Japan", "South Korea", "Taiwan", "Philippines"], countryIds: ["JPN", "KOR", "TWN", "PHL"], answerIndex: 1, explanation: "The meeting took place in Seoul, South Korea.", evidence: "met in Seoul" },
    ],
  },
  {
    id: "demo-kenya-registration",
    title: "Kenya launches voter-registration drive ahead of 2027 election",
    category: "election",
    countries: ["KEN"],
    figures: ["william-ruto"],
    location: [-1.29, 36.82],
    region: "Africa",
    hoursAgo: 60,
    signals: { outlets: 2, articles: 3, consequences: 0.3, significance: 0.5 },
    whatHappened: [
      F("In this demo scenario, Kenya's electoral commission opened a nationwide drive to register new voters, especially young people."),
      F("Registration centres were set up in all 47 counties."),
      O("Civil-society groups said the drive was a test of public trust in the commission."),
    ],
    background: [
      F("Kenya holds general elections every five years; the next is due in August 2027."),
      F("William Ruto was elected president in 2022."),
      F("Kenya is divided into 47 counties, created under the 2010 constitution."),
    ],
    involved: [
      { name: "Kenya", kind: "country", ref: "KEN", role: "Holding the registration drive" },
      { name: "William Ruto", kind: "figure", ref: "william-ruto", role: "President of Kenya" },
      { name: "Independent Electoral and Boundaries Commission", kind: "organization", role: "Runs elections" },
    ],
    whyItMatters: [
      F("Kenya has a young population, so first-time voters could shape the outcome."),
      P("A credible process could reduce the risk of post-election disputes."),
    ],
    whatNext: [
      F("The commission said the drive would run for 30 days."),
      P("Turnout among young people will be closely watched as a sign of political engagement."),
    ],
    questions: [
      { type: "multiple_choice", prompt: "When is Kenya's next general election due?", choices: ["December 2026", "August 2027", "March 2028", "June 2030"], answerIndex: 1, explanation: "It is due in August 2027.", evidence: "the next is due in August 2027" },
      { type: "multiple_choice", prompt: "How many counties does Kenya have?", choices: ["12", "26", "47", "54"], answerIndex: 2, explanation: "Kenya has 47 counties under its 2010 constitution.", evidence: "47 counties" },
      { type: "figure_id", prompt: "Who was elected President of Kenya in 2022?", choices: ["Abiy Ahmed", "William Ruto", "Bola Tinubu", "Cyril Ramaphosa"], figureIds: ["abiy-ahmed", "william-ruto", "bola-tinubu", "cyril-ramaphosa"], answerIndex: 1, explanation: "William Ruto won the 2022 election.", evidence: "William Ruto was elected president in 2022" },
    ],
  },
  {
    id: "demo-arctic-sar",
    title: "Arctic states agree a joint search-and-rescue plan",
    category: "diplomacy",
    countries: ["NOR", "CAN", "DNK", "ISL", "FIN", "SWE", "USA"],
    location: [69.65, 18.96],
    region: "Europe",
    hoursAgo: 70,
    signals: { outlets: 2, articles: 3, consequences: 0.4, significance: 0.45 },
    whatHappened: [
      F("In this demo scenario, officials from Arctic states agreed a plan to share ships and aircraft for search-and-rescue missions as sea ice retreats."),
      F("The plan was announced in Tromsø, Norway."),
    ],
    background: [
      F("The Arctic Council, founded in 1996, has eight member states: Canada, Denmark, Finland, Iceland, Norway, Russia, Sweden and the United States."),
      F("Cooperation with Russia in the Council was largely paused after Russia's 2022 invasion of Ukraine."),
      F("Melting sea ice is opening new shipping routes and increasing traffic in the region."),
    ],
    involved: [
      { name: "Norway", kind: "country", ref: "NOR", role: "Host" },
      { name: "Canada", kind: "country", ref: "CAN", role: "Participant" },
      { name: "Denmark (including Greenland)", kind: "country", ref: "DNK", role: "Participant" },
      { name: "Arctic Council", kind: "organization", role: "Regional forum" },
    ],
    whyItMatters: [
      F("More ships in remote, icy waters increase the chance of accidents far from rescue services."),
      O("Some experts say practical cooperation like this keeps diplomacy alive when bigger issues are stuck."),
    ],
    whatNext: [
      P("Joint exercises could follow next summer."),
    ],
    questions: [
      { type: "multiple_choice", prompt: "How many member states does the Arctic Council have?", choices: ["Five", "Eight", "Twelve", "Twenty"], answerIndex: 1, explanation: "It has eight member states.", evidence: "has eight member states" },
      { type: "cause_effect", prompt: "Why is search-and-rescue becoming more important in the Arctic?", choices: ["Sea ice is retreating and shipping traffic is increasing", "The Arctic Council was dissolved", "Arctic cities are growing rapidly", "Air travel has been banned"], answerIndex: 0, explanation: "Retreating ice opens routes and increases traffic in remote waters.", evidence: "Melting sea ice is opening new shipping routes" },
      { type: "map", prompt: "Where was the plan announced?", choices: ["Iceland", "Norway", "Finland", "Canada"], countryIds: ["ISL", "NOR", "FIN", "CAN"], answerIndex: 1, explanation: "It was announced in Tromsø, Norway.", evidence: "announced in Tromsø, Norway" },
    ],
  },
  {
    id: "demo-panama-water",
    title: "Panama Canal authority advances a new reservoir to secure water supply",
    category: "trade",
    countries: ["PAN"],
    location: [9.08, -79.68],
    region: "Americas",
    hoursAgo: 84,
    signals: { outlets: 2, articles: 3, consequences: 0.45, significance: 0.5 },
    whatHappened: [
      F("In this demo scenario, the Panama Canal Authority approved the next phase of a reservoir project meant to protect the canal from drought."),
      F("Officials said the project would also supply drinking water to Panama's cities."),
      D("Some local communities dispute the compensation offered for land that would be flooded."),
    ],
    background: [
      F("The Panama Canal connects the Atlantic and Pacific oceans and opened in 1914."),
      F("Its locks use fresh water from lakes, so droughts can force limits on the number of ships."),
      F("Panama took full control of the canal from the United States in 1999."),
    ],
    involved: [
      { name: "Panama", kind: "country", ref: "PAN", role: "Operates the canal" },
      { name: "Panama Canal Authority", kind: "organization", role: "Canal operator" },
      { name: "Affected local communities", kind: "group", role: "Living in the reservoir area" },
    ],
    whyItMatters: [
      F("The canal is a key route for trade between Asia and the Americas' east coast."),
      P("A reliable water supply could reduce future shipping restrictions during dry years."),
    ],
    whatNext: [
      P("Construction could take several years, and timelines are uncertain."),
    ],
    questions: [
      { type: "cause_effect", prompt: "Why can droughts reduce the number of ships using the canal?", choices: ["The locks use fresh water from lakes", "Ships need rain to navigate", "Droughts close the ports by law", "Ships run on lake water"], answerIndex: 0, explanation: "The locks rely on fresh water, so low lake levels limit transits.", evidence: "Its locks use fresh water from lakes" },
      { type: "multiple_choice", prompt: "When did Panama take full control of the canal?", choices: ["1914", "1977", "1999", "2016"], answerIndex: 2, explanation: "Panama took full control in 1999.", evidence: "Panama took full control of the canal from the United States in 1999" },
      { type: "true_false", prompt: "True or false: the compensation for flooded land is undisputed.", choices: ["True", "False"], answerIndex: 1, explanation: "False: some communities dispute the compensation.", evidence: "Some local communities dispute the compensation" },
    ],
  },
  {
    id: "demo-pacific-forum",
    title: "Pacific leaders press for action on rising seas",
    category: "diplomacy",
    countries: ["FJI", "TUV", "AUS", "NZL"],
    figures: ["anthony-albanese"],
    location: [-18.14, 178.44],
    region: "Oceania",
    hoursAgo: 96,
    signals: { outlets: 2, articles: 2, consequences: 0.35, significance: 0.6 },
    whatHappened: [
      F("In this demo scenario, Pacific Islands Forum leaders issued a statement calling for faster cuts to greenhouse-gas emissions."),
      F("The statement also asked for more climate-adaptation finance for low-lying islands."),
    ],
    background: [
      F("The Pacific Islands Forum brings together 18 members, including Australia, New Zealand and many island states."),
      F("Low-lying nations such as Tuvalu are among the most exposed to sea-level rise."),
      F("In 2023 Australia and Tuvalu signed a treaty that includes a pathway for Tuvaluans to migrate to Australia."),
    ],
    involved: [
      { name: "Fiji", kind: "country", ref: "FJI", role: "Forum member" },
      { name: "Tuvalu", kind: "country", ref: "TUV", role: "Low-lying member state" },
      { name: "Australia", kind: "country", ref: "AUS", role: "Forum member" },
      { name: "Pacific Islands Forum", kind: "organization", role: "Regional body" },
    ],
    whyItMatters: [
      F("For some island nations, sea-level rise threatens land, fresh water and long-term survival."),
      O("Island leaders argue that major emitters bear responsibility for helping them adapt."),
    ],
    whatNext: [
      P("Forum members are expected to push these demands at the next UN climate conference."),
    ],
    questions: [
      { type: "multiple_choice", prompt: "What did Australia and Tuvalu sign in 2023?", choices: ["A fishing ban", "A treaty including a migration pathway for Tuvaluans", "A currency union", "A military alliance with China"], answerIndex: 1, explanation: "The 2023 treaty includes a migration pathway.", evidence: "includes a pathway for Tuvaluans to migrate to Australia" },
      { type: "multiple_choice", prompt: "How many members does the Pacific Islands Forum have?", choices: ["8", "12", "18", "30"], answerIndex: 2, explanation: "It has 18 members.", evidence: "18 members" },
      { type: "cause_effect", prompt: "Why are nations like Tuvalu especially exposed?", choices: ["They are low-lying", "They have no coastline", "They are in the Arctic", "They are landlocked"], answerIndex: 0, explanation: "Low elevation leaves them exposed to sea-level rise.", evidence: "Low-lying nations such as Tuvalu are among the most exposed" },
    ],
  },
];

const demoSource = (id: string, publishedAt: string): SourceRef => ({
  id: `${id}-src`,
  publication: "Demo",
  headline: "Illustrative demo scenario: no real article exists for this event",
  url: null,
  publishedAt,
});

const words = (cs: Claim[]) => cs.reduce((n, c) => n + c.text.split(/\s+/).length, 0);

export function buildDemoContent(now: Date): { events: NewsEvent[]; quizzes: Quiz[] } {
  const events: NewsEvent[] = [];
  const quizzes: Quiz[] = [];
  for (const s of SPECS) {
    const when = new Date(now.getTime() - s.hoursAgo * 3600_000);
    const importance = scoreImportance({
      outlets: s.signals.outlets,
      articles: s.signals.articles,
      ageHours: s.hoursAgo,
      consequences: s.signals.consequences,
      significance: s.signals.significance,
      category: s.category,
    });
    const quizId = `${s.id}-quiz`;
    const wordCount = words([...s.whatHappened, ...s.background, ...s.whyItMatters, ...s.whatNext]) + s.involved.length * 8;
    events.push({
      id: s.id,
      title: s.title,
      category: s.category,
      countries: s.countries,
      figures: s.figures ?? [],
      location: { lat: s.location[0], lng: s.location[1] },
      region: s.region,
      eventDate: when.toISOString(),
      updatedAt: when.toISOString(),
      importance,
      isDemo: true,
      briefing: {
        whatHappened: s.whatHappened,
        background: s.background,
        involved: s.involved,
        whyItMatters: s.whyItMatters,
        whatNext: s.whatNext,
        readingMinutes: Math.max(2, Math.round(wordCount / 120)),
      },
      sources: [demoSource(s.id, when.toISOString())],
      quizId,
    });
    quizzes.push({ id: quizId, eventId: s.id, category: s.category, questions: s.questions.map((q, i) => ({ ...q, id: `${quizId}-q${i + 1}` })) });
  }
  return { events, quizzes };
}
