export type CircuitMarkerType = "start" | "sector" | "speed";

export type CircuitLayoutMarker = {
  label: string;
  x: number;
  y: number;
  type: CircuitMarkerType;
};

export type CircuitLayout = {
  title: string;
  viewBox: string;
  path: string;
  direction: "Clockwise" | "Anti-clockwise";
  lengthKm: string;
  turns: number;
  longestStraight: string;
  markers: readonly CircuitLayoutMarker[];
};

export type CircuitVectorAsset = {
  url: string;
  sourceHref: string;
  attributionLabel: string;
  licenseHref: string;
};

const CIRCUIT_LAYOUTS = {
  albert_park: {
    title: "Albert Park Circuit",
    viewBox: "0 0 420 280",
    path: "M75 205 C113 233 181 232 223 209 L330 151 C362 134 376 95 353 70 C329 43 284 47 257 76 L212 125 C189 151 148 146 129 116 L101 73 C82 44 42 57 49 92 L75 205",
    direction: "Clockwise",
    lengthKm: "5.278 km",
    turns: 14,
    longestStraight: "Lakeside Drive",
    markers: [
      { label: "Start / finish", x: 104, y: 218, type: "start" },
      { label: "Sector 1: Jones to Whiteford", x: 98, y: 75, type: "sector" },
      { label: "Sector 2: Lakeside sweep", x: 224, y: 207, type: "speed" },
      { label: "Sector 3: Ascari approach", x: 340, y: 149, type: "sector" },
    ],
  },
  americas: {
    title: "Circuit of the Americas",
    viewBox: "0 0 420 280",
    path: "M72 210 L92 88 C99 44 151 35 183 58 L247 105 C277 127 328 104 346 66 C358 40 386 47 388 78 C391 121 336 146 296 140 L233 131 C202 126 179 150 194 177 L232 228 C246 248 228 268 204 255 L151 226 C125 211 97 214 72 210",
    direction: "Anti-clockwise",
    lengthKm: "5.513 km",
    turns: 20,
    longestStraight: "1.0 km back straight",
    markers: [
      { label: "Start / finish", x: 82, y: 184, type: "start" },
      { label: "Sector 1: Esses", x: 152, y: 52, type: "sector" },
      { label: "Sector 2: Back straight", x: 309, y: 121, type: "speed" },
      { label: "Sector 3: Stadium", x: 213, y: 231, type: "sector" },
    ],
  },
  bahrain: {
    title: "Bahrain International Circuit",
    viewBox: "0 0 420 280",
    path: "M80 205 L254 205 C304 205 341 174 342 133 C343 91 303 69 266 88 L214 115 C190 127 165 111 170 84 C176 50 234 42 266 52 L322 70 C351 80 375 61 363 36 C350 10 296 19 246 39 L125 87 C91 101 72 132 76 169 L80 205",
    direction: "Clockwise",
    lengthKm: "5.412 km",
    turns: 15,
    longestStraight: "1.1 km pit straight",
    markers: [
      { label: "Start / finish", x: 115, y: 205, type: "start" },
      { label: "Sector 1: Turn 1 braking", x: 322, y: 181, type: "sector" },
      { label: "Sector 2: Desert loop", x: 216, y: 86, type: "sector" },
      { label: "Sector 3: Final sweep", x: 105, y: 121, type: "speed" },
    ],
  },
  baku: {
    title: "Baku City Circuit",
    viewBox: "0 0 420 280",
    path: "M62 215 L354 215 L354 166 L298 166 L298 116 L348 116 L348 70 L270 70 L270 111 L213 111 L213 62 L159 62 L159 124 L95 124 L95 171 L62 171 Z",
    direction: "Anti-clockwise",
    lengthKm: "6.003 km",
    turns: 20,
    longestStraight: "2.2 km main straight",
    markers: [
      { label: "Start / finish", x: 111, y: 215, type: "start" },
      { label: "Sector 1: Seaside straight", x: 316, y: 215, type: "speed" },
      { label: "Sector 2: Castle section", x: 182, y: 63, type: "sector" },
      { label: "Sector 3: Boulevard run", x: 83, y: 172, type: "sector" },
    ],
  },
  catalunya: {
    title: "Circuit de Barcelona-Catalunya",
    viewBox: "0 0 420 280",
    path: "M79 210 L257 210 C314 210 364 176 361 132 C358 93 319 75 283 91 L222 117 C192 130 163 109 171 78 C180 42 134 31 101 55 C68 80 57 147 79 210 Z",
    direction: "Clockwise",
    lengthKm: "4.657 km",
    turns: 14,
    longestStraight: "1.0 km pit straight",
    markers: [
      { label: "Start / finish", x: 119, y: 210, type: "start" },
      { label: "Sector 1: Elf complex", x: 329, y: 183, type: "sector" },
      { label: "Sector 2: Campsa", x: 223, y: 117, type: "speed" },
      { label: "Sector 3: Stadium", x: 95, y: 63, type: "sector" },
    ],
  },
  hungaroring: {
    title: "Hungaroring",
    viewBox: "0 0 420 280",
    path: "M84 210 C134 238 206 224 240 179 L282 123 C305 92 356 97 374 132 C391 166 360 204 319 197 L249 185 C216 179 201 141 225 118 L265 80 C292 54 269 25 233 38 L142 72 C89 92 55 165 84 210 Z",
    direction: "Clockwise",
    lengthKm: "4.381 km",
    turns: 14,
    longestStraight: "Pit straight to Turn 1",
    markers: [
      { label: "Start / finish", x: 118, y: 221, type: "start" },
      { label: "Sector 1: Turn 1 braking", x: 341, y: 128, type: "sector" },
      { label: "Sector 2: Flowing middle", x: 226, y: 118, type: "sector" },
      { label: "Sector 3: Final corner", x: 103, y: 85, type: "speed" },
    ],
  },
  imola: {
    title: "Autodromo Internazionale Enzo e Dino Ferrari",
    viewBox: "0 0 420 280",
    path: "M78 198 C131 235 210 221 249 174 L303 109 C332 74 385 91 383 139 C380 185 314 202 276 176 L224 140 C194 120 158 137 159 174 C161 219 100 225 78 198 Z M124 151 C96 130 87 86 118 65 C153 41 202 60 210 99",
    direction: "Anti-clockwise",
    lengthKm: "4.909 km",
    turns: 19,
    longestStraight: "Rivazza to Tamburello",
    markers: [
      { label: "Start / finish", x: 111, y: 211, type: "start" },
      { label: "Sector 1: Tamburello", x: 124, y: 68, type: "sector" },
      { label: "Sector 2: Acque Minerali", x: 249, y: 174, type: "sector" },
      { label: "Sector 3: Rivazza", x: 343, y: 187, type: "speed" },
    ],
  },
  interlagos: {
    title: "Autódromo José Carlos Pace",
    viewBox: "0 0 420 280",
    path: "M78 190 C121 204 164 206 205 196 L312 170 C352 160 374 128 360 96 C347 65 309 53 281 73 L230 110 C205 129 178 117 177 87 C177 53 135 43 110 66 C83 92 74 145 78 190 Z",
    direction: "Anti-clockwise",
    lengthKm: "4.309 km",
    turns: 15,
    longestStraight: "Reta Oposta",
    markers: [
      { label: "Start / finish", x: 104, y: 194, type: "start" },
      { label: "Sector 1: Senna S", x: 83, y: 141, type: "sector" },
      { label: "Sector 2: Infield", x: 222, y: 115, type: "sector" },
      { label: "Sector 3: Subida dos Boxes", x: 299, y: 174, type: "speed" },
    ],
  },
  marina_bay: {
    title: "Marina Bay Street Circuit",
    viewBox: "0 0 420 280",
    path: "M74 210 L166 210 L166 168 L117 168 L117 121 L180 121 L180 74 L246 74 L246 113 L337 113 L337 158 L292 158 L292 207 L350 207 L350 245 L225 245 L225 208 L74 210",
    direction: "Clockwise",
    lengthKm: "4.940 km",
    turns: 19,
    longestStraight: "Raffles Boulevard",
    markers: [
      { label: "Start / finish", x: 115, y: 210, type: "start" },
      { label: "Sector 1: City hall", x: 153, y: 122, type: "sector" },
      { label: "Sector 2: Bayfront", x: 305, y: 113, type: "speed" },
      { label: "Sector 3: Final complex", x: 293, y: 245, type: "sector" },
    ],
  },
  jeddah: {
    title: "Jeddah Corniche Circuit",
    viewBox: "0 0 420 280",
    path: "M65 216 C112 232 160 216 179 177 L211 111 C232 68 286 46 333 64 C377 81 389 126 359 154 C331 181 283 172 256 143 C232 117 195 126 185 162 L169 220 C158 260 93 255 65 216 Z",
    direction: "Anti-clockwise",
    lengthKm: "6.174 km",
    turns: 27,
    longestStraight: "Corniche blast to Turn 27",
    markers: [
      { label: "Start / finish", x: 94, y: 224, type: "start" },
      { label: "Sector 1: Fast esses", x: 206, y: 112, type: "speed" },
      { label: "Sector 2: Lagoon loop", x: 334, y: 65, type: "sector" },
      { label: "Sector 3: Final banked turn", x: 170, y: 219, type: "sector" },
    ],
  },
  losail: {
    title: "Lusail International Circuit",
    viewBox: "0 0 420 280",
    path: "M76 204 C111 235 177 238 224 207 L318 144 C352 121 363 77 333 54 C301 29 251 47 231 86 L207 133 C193 162 151 160 136 132 L110 81 C94 49 55 61 57 96 L76 204",
    direction: "Clockwise",
    lengthKm: "5.419 km",
    turns: 16,
    longestStraight: "1.1 km pit straight",
    markers: [
      { label: "Start / finish", x: 108, y: 222, type: "start" },
      { label: "Sector 1: Turn 1", x: 75, y: 99, type: "sector" },
      { label: "Sector 2: Desert sweepers", x: 226, y: 207, type: "sector" },
      { label: "Sector 3: Final straight", x: 312, y: 145, type: "speed" },
    ],
  },
  miami: {
    title: "Miami International Autodrome",
    viewBox: "0 0 420 280",
    path: "M73 205 L196 205 C239 205 264 173 247 139 L225 95 C207 58 239 31 279 45 L337 65 C374 78 390 121 365 153 C337 188 282 190 241 175 L169 149 C132 136 91 159 73 205 Z",
    direction: "Anti-clockwise",
    lengthKm: "5.412 km",
    turns: 19,
    longestStraight: "1.28 km back straight",
    markers: [
      { label: "Start / finish", x: 111, y: 205, type: "start" },
      { label: "Sector 1: Turn 1", x: 238, y: 192, type: "sector" },
      { label: "Sector 2: Hard Rock loop", x: 279, y: 45, type: "sector" },
      { label: "Sector 3: Back straight", x: 350, y: 157, type: "speed" },
    ],
  },
  monaco: {
    title: "Circuit de Monaco",
    viewBox: "0 0 420 280",
    path: "M88 202 C122 215 169 213 195 186 L230 150 C254 125 303 132 324 159 C340 180 373 171 376 143 C380 104 322 91 287 83 C251 75 239 43 207 39 C169 35 153 72 132 101 L93 154 C80 173 76 193 88 202 Z",
    direction: "Clockwise",
    lengthKm: "3.337 km",
    turns: 19,
    longestStraight: "Tunnel to Nouvelle Chicane",
    markers: [
      { label: "Start / finish", x: 118, y: 207, type: "start" },
      { label: "Sector 1: Sainte Dévote", x: 93, y: 159, type: "sector" },
      { label: "Sector 2: Tunnel", x: 286, y: 83, type: "speed" },
      { label: "Sector 3: Swimming pool", x: 335, y: 162, type: "sector" },
    ],
  },
  monza: {
    title: "Autodromo Nazionale di Monza",
    viewBox: "0 0 420 280",
    path: "M78 206 L299 206 C345 206 376 176 353 148 L310 96 C292 75 303 51 334 55 C366 60 388 89 376 119 C363 151 314 177 276 181 L222 187 C190 191 162 167 174 139 C185 113 228 100 227 73 C226 45 186 37 146 48 L107 59 C75 68 56 98 65 132 L78 206",
    direction: "Clockwise",
    lengthKm: "5.793 km",
    turns: 11,
    longestStraight: "1.1 km pit straight",
    markers: [
      { label: "Start / finish", x: 112, y: 206, type: "start" },
      { label: "Sector 1: Rettifilo", x: 333, y: 197, type: "sector" },
      { label: "Sector 2: Lesmo", x: 210, y: 86, type: "sector" },
      {
        label: "Sector 3: Ascari and Parabolica",
        x: 336,
        y: 58,
        type: "speed",
      },
    ],
  },
  paul_ricard: {
    title: "Circuit Paul Ricard",
    viewBox: "0 0 420 280",
    path: "M72 204 L249 204 C303 204 347 171 350 126 C353 82 308 55 267 75 L209 104 C181 118 146 99 151 68 C157 34 103 29 75 58 C44 90 45 166 72 204 Z",
    direction: "Clockwise",
    lengthKm: "5.842 km",
    turns: 15,
    longestStraight: "Mistral Straight",
    markers: [
      { label: "Start / finish", x: 112, y: 204, type: "start" },
      { label: "Sector 1: Verrerie", x: 151, y: 68, type: "sector" },
      { label: "Sector 2: Mistral Straight", x: 297, y: 194, type: "speed" },
      { label: "Sector 3: Beausset", x: 285, y: 72, type: "sector" },
    ],
  },
  red_bull_ring: {
    title: "Red Bull Ring",
    viewBox: "0 0 420 280",
    path: "M75 210 L260 210 C305 210 346 188 362 154 C380 115 351 81 309 90 L231 107 C196 115 169 88 184 59 C200 27 151 18 117 50 C79 87 62 160 75 210 Z",
    direction: "Clockwise",
    lengthKm: "4.318 km",
    turns: 10,
    longestStraight: "Schlossgold Straight",
    markers: [
      { label: "Start / finish", x: 111, y: 210, type: "start" },
      { label: "Sector 1: Uphill Turn 3", x: 184, y: 59, type: "sector" },
      { label: "Sector 2: Back straight", x: 260, y: 210, type: "speed" },
      { label: "Sector 3: Final downhill", x: 336, y: 176, type: "sector" },
    ],
  },
  rodriguez: {
    title: "Autódromo Hermanos Rodríguez",
    viewBox: "0 0 420 280",
    path: "M70 211 L273 211 C322 211 362 184 364 145 C366 105 331 82 292 96 L236 116 C204 128 175 105 183 75 C191 43 151 32 118 54 C79 81 60 154 70 211 Z M275 212 L275 165 L335 165 L335 212",
    direction: "Clockwise",
    lengthKm: "4.304 km",
    turns: 17,
    longestStraight: "1.2 km pit straight",
    markers: [
      { label: "Start / finish", x: 111, y: 211, type: "start" },
      { label: "Sector 1: Moisés Solana", x: 330, y: 186, type: "sector" },
      { label: "Sector 2: Esses", x: 235, y: 116, type: "sector" },
      { label: "Sector 3: Foro Sol", x: 300, y: 165, type: "speed" },
    ],
  },
  shanghai: {
    title: "Shanghai International Circuit",
    viewBox: "0 0 420 280",
    path: "M80 207 C116 233 181 230 214 192 L260 139 C282 113 323 118 342 146 C361 174 346 209 313 218 C270 230 236 198 245 155 L259 86 C268 42 217 23 185 55 C154 86 170 135 135 152 C103 168 68 148 71 113 C74 78 113 60 144 72",
    direction: "Clockwise",
    lengthKm: "5.451 km",
    turns: 16,
    longestStraight: "1.17 km back straight",
    markers: [
      { label: "Start / finish", x: 111, y: 216, type: "start" },
      { label: "Sector 1: Snail", x: 184, y: 55, type: "sector" },
      { label: "Sector 2: Back straight", x: 259, y: 87, type: "speed" },
      { label: "Sector 3: Hairpin", x: 318, y: 218, type: "sector" },
    ],
  },
  silverstone: {
    title: "Silverstone Circuit",
    viewBox: "0 0 420 280",
    path: "M78 184 L145 118 C175 88 225 82 260 102 L335 145 C366 163 377 204 354 225 C331 246 287 238 269 209 L243 167 C230 146 198 143 180 160 L130 207 C104 232 64 217 78 184 Z",
    direction: "Clockwise",
    lengthKm: "5.891 km",
    turns: 18,
    longestStraight: "Hangar Straight",
    markers: [
      { label: "Start / finish", x: 122, y: 207, type: "start" },
      { label: "Sector 1: Abbey to Loop", x: 151, y: 115, type: "sector" },
      { label: "Sector 2: Maggotts-Becketts", x: 267, y: 105, type: "sector" },
      { label: "Sector 3: Hangar and Club", x: 340, y: 221, type: "speed" },
    ],
  },
  spa: {
    title: "Circuit de Spa-Francorchamps",
    viewBox: "0 0 420 280",
    path: "M86 218 C127 245 192 233 215 190 L244 136 C260 105 299 99 333 117 C369 137 397 100 371 68 C345 37 287 46 252 72 L190 118 C164 138 126 123 120 91 C114 58 69 52 54 83 C33 125 48 191 86 218 Z",
    direction: "Clockwise",
    lengthKm: "7.004 km",
    turns: 19,
    longestStraight: "Kemmel Straight",
    markers: [
      { label: "Start / finish", x: 96, y: 221, type: "start" },
      { label: "Sector 1: Eau Rouge", x: 121, y: 93, type: "sector" },
      { label: "Sector 2: Pouhon", x: 247, y: 136, type: "sector" },
      { label: "Sector 3: Blanchimont", x: 356, y: 116, type: "speed" },
    ],
  },
  vegas: {
    title: "Las Vegas Strip Circuit",
    viewBox: "0 0 420 280",
    path: "M66 214 L350 214 L350 168 L256 168 L256 110 L336 110 L336 68 L123 68 L123 125 L66 125 Z",
    direction: "Anti-clockwise",
    lengthKm: "6.201 km",
    turns: 17,
    longestStraight: "1.9 km Las Vegas Strip",
    markers: [
      { label: "Start / finish", x: 109, y: 214, type: "start" },
      { label: "Sector 1: Sphere complex", x: 123, y: 92, type: "sector" },
      { label: "Sector 2: Strip straight", x: 267, y: 68, type: "speed" },
      { label: "Sector 3: Harmon run", x: 313, y: 214, type: "sector" },
    ],
  },
  villeneuve: {
    title: "Circuit Gilles Villeneuve",
    viewBox: "0 0 420 280",
    path: "M71 209 L296 209 C349 209 379 176 359 139 C343 110 300 104 270 122 L213 157 C183 176 141 163 130 128 L112 72 C101 38 59 46 58 82 L71 209",
    direction: "Clockwise",
    lengthKm: "4.361 km",
    turns: 14,
    longestStraight: "Casino straight",
    markers: [
      { label: "Start / finish", x: 112, y: 209, type: "start" },
      { label: "Sector 1: Senna curve", x: 112, y: 72, type: "sector" },
      { label: "Sector 2: Island sweep", x: 213, y: 157, type: "sector" },
      { label: "Sector 3: Wall of Champions", x: 332, y: 203, type: "speed" },
    ],
  },
  suzuka: {
    title: "Suzuka Circuit",
    viewBox: "0 0 420 280",
    path: "M79 178 C120 137 159 136 198 177 C230 211 287 219 323 188 C358 157 346 103 304 91 C268 81 230 100 206 133 C184 163 143 159 132 126 C119 87 162 53 202 68 C235 81 249 120 276 138 C303 157 353 148 376 119",
    direction: "Clockwise",
    lengthKm: "5.807 km",
    turns: 18,
    longestStraight: "1.2 km back straight",
    markers: [
      { label: "Start / finish", x: 96, y: 165, type: "start" },
      { label: "Sector 1: Esses", x: 139, y: 126, type: "sector" },
      { label: "Sector 2: Hairpin", x: 209, y: 133, type: "sector" },
      { label: "Sector 3: 130R", x: 346, y: 144, type: "speed" },
    ],
  },
  yas_marina: {
    title: "Yas Marina Circuit",
    viewBox: "0 0 420 280",
    path: "M78 205 L173 205 C211 205 234 181 235 148 C237 102 278 74 326 82 C366 89 386 120 373 154 C357 194 300 205 260 185 L214 162 C190 150 162 164 164 191 L165 235 L78 235 Z",
    direction: "Anti-clockwise",
    lengthKm: "5.281 km",
    turns: 16,
    longestStraight: "1.2 km back straight",
    markers: [
      { label: "Start / finish", x: 111, y: 205, type: "start" },
      { label: "Sector 1: North hairpin", x: 230, y: 148, type: "sector" },
      { label: "Sector 2: Back straight", x: 327, y: 83, type: "speed" },
      { label: "Sector 3: Marina", x: 169, y: 230, type: "sector" },
    ],
  },
  zandvoort: {
    title: "Circuit Zandvoort",
    viewBox: "0 0 420 280",
    path: "M83 200 C121 219 172 208 184 168 C195 130 237 112 275 130 C311 147 358 132 370 96 C384 53 328 28 289 54 C257 75 242 114 203 116 C162 119 148 77 113 84 C76 92 61 163 83 200 Z",
    direction: "Clockwise",
    lengthKm: "4.259 km",
    turns: 14,
    longestStraight: "Pit straight to Tarzan",
    markers: [
      { label: "Start / finish", x: 111, y: 205, type: "start" },
      { label: "Sector 1: Tarzan", x: 89, y: 159, type: "sector" },
      { label: "Sector 2: Scheivlak", x: 229, y: 115, type: "speed" },
      { label: "Sector 3: Arie Luyendyk", x: 352, y: 123, type: "sector" },
    ],
  },
} as const satisfies Readonly<Record<string, CircuitLayout>>;

type CircuitLayoutId = keyof typeof CIRCUIT_LAYOUTS;

type CircuitVectorStyle = "detailed" | "minimal";

type CircuitVectorSource = {
  layoutId: string;
  style: CircuitVectorStyle;
};

const JULES_ROY_REPO_URL = "https://github.com/julesr0y/f1-circuits-svg";
const JULES_ROY_LICENSE_URL = "https://creativecommons.org/licenses/by/4.0/";
const JULES_ROY_RAW_BASE_URL =
  "https://raw.githubusercontent.com/julesr0y/f1-circuits-svg/main/circuits";

const CIRCUIT_VECTOR_SOURCES = {
  albert_park: { layoutId: "melbourne-2", style: "detailed" },
  americas: { layoutId: "austin-1", style: "detailed" },
  bahrain: { layoutId: "bahrain-1", style: "detailed" },
  baku: { layoutId: "baku-1", style: "detailed" },
  catalunya: { layoutId: "catalunya-6", style: "detailed" },
  hungaroring: { layoutId: "hungaroring-3", style: "detailed" },
  imola: { layoutId: "imola-3", style: "minimal" },
  interlagos: { layoutId: "interlagos-2", style: "detailed" },
  jeddah: { layoutId: "jeddah-1", style: "detailed" },
  losail: { layoutId: "lusail-1", style: "detailed" },
  marina_bay: { layoutId: "marina-bay-4", style: "detailed" },
  miami: { layoutId: "miami-1", style: "detailed" },
  monaco: { layoutId: "monaco-6", style: "detailed" },
  monza: { layoutId: "monza-7", style: "detailed" },
  paul_ricard: { layoutId: "paul-ricard-3", style: "minimal" },
  red_bull_ring: { layoutId: "spielberg-3", style: "detailed" },
  rodriguez: { layoutId: "mexico-city-3", style: "detailed" },
  shanghai: { layoutId: "shanghai-1", style: "detailed" },
  silverstone: { layoutId: "silverstone-8", style: "detailed" },
  spa: { layoutId: "spa-francorchamps-4", style: "detailed" },
  suzuka: { layoutId: "suzuka-2", style: "detailed" },
  vegas: { layoutId: "las-vegas-1", style: "detailed" },
  villeneuve: { layoutId: "montreal-6", style: "detailed" },
  yas_marina: { layoutId: "yas-marina-2", style: "detailed" },
  zandvoort: { layoutId: "zandvoort-5", style: "detailed" },
} as const satisfies Readonly<Record<CircuitLayoutId, CircuitVectorSource>>;

const buildCircuitVectorUrl = ({
  layoutId,
  style,
}: CircuitVectorSource): string =>
  `${JULES_ROY_RAW_BASE_URL}/${style}/white-outline/${layoutId}.svg`;

const buildCircuitVectorSourceUrl = ({
  layoutId,
  style,
}: CircuitVectorSource): string =>
  `${JULES_ROY_REPO_URL}/blob/main/circuits/${style}/white-outline/${layoutId}.svg`;

const hasOwn = <T extends object>(
  object: T,
  key: PropertyKey
): key is keyof T => Object.prototype.hasOwnProperty.call(object, key);

export const getCircuitLayout = (
  circuitId: string | null | undefined
): CircuitLayout | undefined =>
  typeof circuitId === "string" && hasOwn(CIRCUIT_LAYOUTS, circuitId)
    ? CIRCUIT_LAYOUTS[circuitId as CircuitLayoutId]
    : undefined;

export const getCircuitVectorAsset = (
  circuitId: string | null | undefined
): CircuitVectorAsset | undefined => {
  if (
    typeof circuitId !== "string" ||
    !hasOwn(CIRCUIT_VECTOR_SOURCES, circuitId)
  ) {
    return undefined;
  }

  const source = CIRCUIT_VECTOR_SOURCES[circuitId as CircuitLayoutId];

  return {
    url: buildCircuitVectorUrl(source),
    sourceHref: buildCircuitVectorSourceUrl(source),
    attributionLabel: "Jules Roy / F1 Circuits SVG",
    licenseHref: JULES_ROY_LICENSE_URL,
  };
};

export default CIRCUIT_LAYOUTS;
