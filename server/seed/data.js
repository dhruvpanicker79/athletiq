// DEMO DATA — fictional players and generated scores. Not real-world results.
export const SPORTS = [
  { name: 'Football', slug: 'football' },
  { name: 'Cricket', slug: 'cricket' },
  { name: 'Basketball', slug: 'basketball' },
];

// key, name, shortName, sport, country, season, color, format, live matches to generate
export const COMPETITIONS = [
  ['EPL', 'Premier League', 'EPL', 'football', 'England', '2026/27', '#7B3FE4', 'LEAGUE', 2],
  ['LALIGA', 'La Liga', 'LL', 'football', 'Spain', '2026/27', '#FF4B44', 'LEAGUE', 1],
  ['UCL', 'UEFA Champions League', 'UCL', 'football', 'Europe', '2026/27', '#2F6BFF', 'CUP', 0],
  ['ISL', 'Indian Super League', 'ISL', 'football', 'India', '2026/27', '#F26522', 'LEAGUE', 1],
  ['IPL', 'Indian Premier League', 'IPL', 'cricket', 'India', '2026', '#3B5BDB', 'LEAGUE', 1],
  ['ICC', 'ICC T20 World Cup', 'T20WC', 'cricket', 'International', '2026', '#0BA5A4', 'CUP', 0],
  ['INTL', 'International T20 Series', 'INTL', 'cricket', 'International', '2026/27', '#C5F36A', 'LEAGUE', 1],
  ['NBA', 'NBA', 'NBA', 'basketball', 'USA', '2026/27', '#E03A3E', 'LEAGUE', 1],
  ['WNBA', 'WNBA', 'WNBA', 'basketball', 'USA', '2026', '#FA4616', 'LEAGUE', 0],
];

// name, shortName, color, country, venue, competitions
export const TEAMS = {
  football: [
    ['Arsenal', 'ARS', '#EF0107', 'England', 'Emirates Stadium', ['EPL', 'UCL']],
    ['Chelsea', 'CHE', '#034694', 'England', 'Stamford Bridge', ['EPL']],
    ['Liverpool', 'LIV', '#C8102E', 'England', 'Anfield', ['EPL']],
    ['Manchester City', 'MCI', '#6CABDD', 'England', 'Etihad Stadium', ['EPL', 'UCL']],
    ['Manchester United', 'MUN', '#DA291C', 'England', 'Old Trafford', ['EPL']],
    ['Tottenham Hotspur', 'TOT', '#132257', 'England', 'Tottenham Hotspur Stadium', ['EPL']],
    ['Real Madrid', 'RMA', '#FEBE10', 'Spain', 'Santiago Bernabéu', ['LALIGA', 'UCL']],
    ['Barcelona', 'BAR', '#A50044', 'Spain', 'Spotify Camp Nou', ['LALIGA', 'UCL']],
    ['Atlético Madrid', 'ATM', '#CB3524', 'Spain', 'Riyadh Air Metropolitano', ['LALIGA']],
    ['Sevilla', 'SEV', '#D81E05', 'Spain', 'Ramón Sánchez-Pizjuán', ['LALIGA']],
    ['Bayern Munich', 'FCB', '#DC052D', 'Germany', 'Allianz Arena', ['UCL']],
    ['Paris Saint-Germain', 'PSG', '#004170', 'France', 'Parc des Princes', ['UCL']],
    ['Mohun Bagan SG', 'MBSG', '#8B1E3F', 'India', 'Salt Lake Stadium', ['ISL']],
    ['Bengaluru FC', 'BFC', '#1C3F94', 'India', 'Sree Kanteerava Stadium', ['ISL']],
    ['Kerala Blasters', 'KBFC', '#FDB913', 'India', 'Jawaharlal Nehru Stadium, Kochi', ['ISL']],
    ['Mumbai City FC', 'MCFC', '#5BC2E7', 'India', 'Mumbai Football Arena', ['ISL']],
  ],
  cricket: [
    ['Mumbai Indians', 'MI', '#004BA0', 'India', 'Wankhede Stadium', ['IPL']],
    ['Chennai Super Kings', 'CSK', '#F9CD05', 'India', 'M. A. Chidambaram Stadium', ['IPL']],
    ['Royal Challengers Bengaluru', 'RCB', '#EC1C24', 'India', 'M. Chinnaswamy Stadium', ['IPL']],
    ['Kolkata Knight Riders', 'KKR', '#3A225D', 'India', 'Eden Gardens', ['IPL']],
    ['India', 'IND', '#1C5DB4', 'India', 'Narendra Modi Stadium', ['ICC', 'INTL']],
    ['Australia', 'AUS', '#FFCD00', 'Australia', 'Melbourne Cricket Ground', ['ICC', 'INTL']],
    ['England', 'ENG', '#CE1124', 'England', "Lord's", ['ICC', 'INTL']],
    ['South Africa', 'RSA', '#007749', 'South Africa', 'Newlands', ['ICC', 'INTL']],
  ],
  basketball: [
    ['Los Angeles Lakers', 'LAL', '#552583', 'USA', 'Crypto.com Arena', ['NBA']],
    ['Boston Celtics', 'BOS', '#007A33', 'USA', 'TD Garden', ['NBA']],
    ['Golden State Warriors', 'GSW', '#1D428A', 'USA', 'Chase Center', ['NBA']],
    ['Milwaukee Bucks', 'MIL', '#00471B', 'USA', 'Fiserv Forum', ['NBA']],
    ['Las Vegas Aces', 'LVA', '#BA0C2F', 'USA', 'Michelob Ultra Arena', ['WNBA']],
    ['New York Liberty', 'NYL', '#6ECEB2', 'USA', 'Barclays Center', ['WNBA']],
    ['Minnesota Lynx', 'MIN', '#236192', 'USA', 'Target Center', ['WNBA']],
    ['Seattle Storm', 'SEA', '#2C5234', 'USA', 'Climate Pledge Arena', ['WNBA']],
  ],
};

// Fictional name pools for demo squads
export const FIRST = ['Leo', 'Marco', 'Arjun', 'Luca', 'Noah', 'Mateo', 'Kai', 'Ravi', 'Theo', 'Elias', 'Omar', 'Rohan', 'Hugo', 'Nico', 'Isaac', 'Dev', 'Jonas', 'Ade', 'Felix', 'Tomas', 'Kiran', 'Sami', 'Liam', 'Yuki', 'Diego', 'Aarav', 'Milan', 'Ezra', 'Ivan', 'Owen'];
export const LAST = ['Varga', 'Castell', 'Menon', 'Okafor', 'Lindqvist', 'Moreau', 'Sharma', 'Brandt', 'Rossi', 'Haddad', 'Iyer', 'Kowalski', 'Ferreira', 'Nakamura', 'Duarte', 'Reyes', 'Kapoor', 'Novak', 'Adeyemi', 'Silva', 'Bauer', 'Fontaine', 'Pillai', 'Marsh', 'Quinn', 'Torres', 'Holm', 'Rahman', 'Costa', 'Whitlock'];
export const NATIONS = ['England', 'Spain', 'India', 'France', 'Brazil', 'Germany', 'Nigeria', 'Portugal', 'Argentina', 'Japan', 'USA', 'Australia', 'Netherlands', 'Italy'];
export const WOMEN = ['Maya', 'Aisha', 'Sofia', 'Priya', 'Nina', 'Zara', 'Elena', 'Kira', 'Ivy', 'Lena', 'Ana', 'Tara'];
