export const MUSCLE_MAP_BASE_IMAGE = "/images/muscle-map-base.png";
export const SVG_VIEWBOX = "0 0 1280 960";

export const muscleRegions = {
  chest: {
    label: "Chest / Pectoralis Major",
    paths: [
      "M327 202 C292 203 260 221 247 251 C267 282 302 299 344 291 C373 283 389 259 386 233 C371 212 352 202 327 202 Z",
      "M431 202 C466 203 498 221 511 251 C491 282 456 299 414 291 C385 283 369 259 372 233 C387 212 406 202 431 202 Z",
    ],
  },
  upperChest: {
    label: "Pectoralis Major Clavicular Head",
    paths: [
      "M325 197 C293 198 268 207 252 225 C276 236 310 241 347 232 C346 216 340 203 325 197 Z",
      "M433 197 C465 198 490 207 506 225 C482 236 448 241 411 232 C412 216 418 203 433 197 Z",
    ],
  },
  anteriorDeltoid: {
    label: "Anterior Deltoid",
    paths: [
      "M251 218 C223 226 205 253 206 283 C207 307 221 323 240 316 C255 293 265 252 251 218 Z",
      "M507 218 C535 226 553 253 552 283 C551 307 537 323 518 316 C503 293 493 252 507 218 Z",
    ],
  },
  shoulders: {
    label: "Shoulders / Deltoids",
    paths: [
      "M211 210 C180 219 163 247 170 283 C185 278 205 241 211 210 Z",
      "M547 210 C578 219 595 247 588 283 C573 278 553 241 547 210 Z",
      "M806 205 C774 218 754 248 762 284 C790 276 817 239 806 205 Z",
      "M1014 205 C1046 218 1066 248 1058 284 C1030 276 1003 239 1014 205 Z",
    ],
  },
  biceps: {
    label: "Biceps",
    paths: [
      "M231 282 C211 310 204 354 216 392 C239 372 253 322 245 286 Z",
      "M527 282 C547 310 554 354 542 392 C519 372 505 322 513 286 Z",
    ],
  },
  triceps: {
    label: "Triceps Brachii",
    paths: [
      "M217 289 C197 315 185 355 189 396 C194 419 205 434 219 424 C231 390 236 326 217 289 Z",
      "M541 289 C561 315 573 355 569 396 C564 419 553 434 539 424 C527 390 522 326 541 289 Z",
      "M777 286 C753 324 751 384 774 421 C795 391 803 328 792 288 Z",
      "M1043 286 C1067 324 1069 384 1046 421 C1025 391 1017 328 1028 288 Z",
    ],
  },
  forearms: {
    label: "Forearms",
    paths: [
      "M207 392 C183 435 173 499 188 548 C211 524 228 454 224 404 Z",
      "M551 392 C575 435 585 499 570 548 C547 524 530 454 534 404 Z",
      "M760 420 C735 460 724 516 742 558 C768 535 785 468 777 426 Z",
      "M1060 420 C1085 460 1096 516 1078 558 C1052 535 1035 468 1043 426 Z",
    ],
  },
  back: {
    label: "Back",
    paths: [
      "M805 228 C760 282 742 362 768 436 C812 392 842 308 832 235 Z",
      "M1015 228 C1060 282 1078 362 1052 436 C1008 392 978 308 988 235 Z",
    ],
  },
  lats: {
    label: "Lats",
    paths: [
      "M785 295 C748 343 738 408 760 459 C795 445 824 363 820 305 Z",
      "M1035 295 C1072 343 1082 408 1060 459 C1025 445 996 363 1000 305 Z",
    ],
  },
  traps: {
    label: "Traps",
    paths: [
      "M861 118 C826 151 815 191 833 225 C868 207 894 164 893 126 Z",
      "M959 118 C994 151 1005 191 987 225 C952 207 926 164 927 126 Z",
    ],
  },
  abs: {
    label: "Abs / Core",
    paths: [
      "M338 302 C310 339 304 443 330 522 C362 507 373 421 368 326 Z",
      "M420 302 C448 339 454 443 428 522 C396 507 385 421 390 326 Z",
    ],
  },
  obliques: {
    label: "Obliques",
    paths: [
      "M282 316 C257 355 250 438 285 510 C309 468 315 374 300 326 Z",
      "M476 316 C501 355 508 438 473 510 C449 468 443 374 458 326 Z",
    ],
  },
  quads: {
    label: "Quadriceps",
    paths: [
      "M275 548 C232 623 220 742 261 826 C307 767 326 642 314 558 Z",
      "M483 548 C526 623 538 742 497 826 C451 767 432 642 444 558 Z",
    ],
  },
  hamstrings: {
    label: "Hamstrings",
    paths: [
      "M811 552 C772 627 765 745 804 828 C850 763 866 638 852 558 Z",
      "M1009 552 C1048 627 1055 745 1016 828 C970 763 954 638 968 558 Z",
    ],
  },
  glutes: {
    label: "Glutes",
    paths: [
      "M814 445 C776 457 754 493 762 534 C808 547 852 517 857 470 Z",
      "M1006 445 C1044 457 1066 493 1058 534 C1012 547 968 517 963 470 Z",
    ],
  },
  calves: {
    label: "Calves",
    paths: [
      "M286 770 C250 816 248 900 282 933 C314 884 321 812 304 771 Z",
      "M472 770 C508 816 510 900 476 933 C444 884 437 812 454 771 Z",
      "M824 775 C789 825 787 902 821 936 C854 888 860 816 842 775 Z",
      "M996 775 C1031 825 1033 902 999 936 C966 888 960 816 978 775 Z",
    ],
  },
  neck: {
    label: "Neck",
    paths: [
      "M355 115 C340 143 338 180 357 198 C375 180 377 142 363 115 Z",
      "M403 115 C418 143 420 180 401 198 C383 180 381 142 395 115 Z",
      "M901 104 C879 139 878 178 902 210 C927 178 927 138 910 104 Z",
    ],
  },
};

export const muscleAliases = [
  {
    key: "upperChest",
    matches: [
      "pectoralis major clavicular",
      "upper chest",
      "clavicular head",
      "clavicular",
    ],
  },
  {
    key: "chest",
    matches: [
      "pectoralis major sternal",
      "pectoralis major",
      "pectorals",
      "pectoralis",
      "pec major",
      "pecs",
      "chest",
    ],
  },
  {
    key: "anteriorDeltoid",
    matches: [
      "anterior deltoid",
      "front deltoid",
      "front delt",
      "deltoid anterior",
    ],
  },
  {
    key: "shoulders",
    matches: [
      "posterior deltoid",
      "rear delt",
      "rear deltoid",
      "lateral deltoid",
      "middle deltoid",
      "side delt",
      "deltoids",
      "deltoid",
      "shoulder",
      "shoulders",
      "delts",
    ],
  },
  { key: "biceps", matches: ["biceps brachii", "biceps", "bicep"] },
  { key: "triceps", matches: ["triceps brachii", "triceps", "tricep"] },
  {
    key: "forearms",
    matches: [
      "forearm",
      "forearms",
      "brachioradialis",
      "wrist flexors",
      "wrist extensors",
    ],
  },
  { key: "lats", matches: ["latissimus dorsi", "lats", "lat"] },
  { key: "traps", matches: ["trapezius", "traps", "trap"] },
  {
    key: "back",
    matches: ["upper back", "middle back", "back", "rhomboids", "erector spinae", "spine"],
  },
  { key: "abs", matches: ["rectus abdominis", "abdominals", "abs", "core", "waist"] },
  { key: "obliques", matches: ["oblique", "obliques"] },
  { key: "quads", matches: ["quadriceps", "quads", "quad", "vastus"] },
  { key: "hamstrings", matches: ["hamstrings", "hamstring", "biceps femoris"] },
  {
    key: "glutes",
    matches: ["gluteus", "glutes", "glute", "hips", "hip abductors", "hip"],
  },
  { key: "calves", matches: ["calves", "calf", "gastrocnemius", "soleus"] },
  { key: "neck", matches: ["neck", "sternocleidomastoid"] },
];

export const normalizeMuscleName = (value = "") =>
  String(value)
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

export function getMuscleRegionKey(muscle) {
  const normalized = normalizeMuscleName(muscle);
  if (!normalized) return null;
  const alias = muscleAliases.find(({ matches }) =>
    matches.some((match) => normalized.includes(normalizeMuscleName(match))),
  );
  return alias?.key || null;
}

export function resolveMuscleRegions(muscles = []) {
  const keys = new Set();
  muscles.forEach((muscle) => {
    const key = getMuscleRegionKey(muscle);
    if (key && muscleRegions[key]) keys.add(key);
  });
  return keys;
}
