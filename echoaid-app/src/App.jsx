import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { EarthquakeDetector } from "./EarthquakeDetector";
import { LocationCellGrid } from "./LocationCellGrid";
import { EarthquakeEventNetwork } from "./EarthquakeEventNetwork";

/* ═══════════════════════════════════════════════════════════════
   ECHOAID — Disaster Evacuation Companion + Earthquake Crowd Sensing
   UW Mathematics & Computer Building No. 17 — 1st Floor
   Floor plan walls extracted from architectural PDF
   Room coordinates from GeoJSON (OpenCV + Tesseract extraction)
   Coordinate space: 3× PDF scale (Matrix 3,3) → ~3672×2376
   
   EARTHQUAKE SENSING:
   - Multiple phones detect strong shaking (acceleration > threshold)
   - Crowd confirmation: 3+ devices in same location cell within 4s
   - Reduces false positives (car, footstep) vs single-device detection
   ═══════════════════════════════════════════════════════════════ */

// Transform: GeoJSON coords → SVG viewBox coords
const S = 0.48, OX = 870, OY = 180;
const tx = x => (x - OX) * S;
const ty = y => (y - OY) * S;

// ── ROOM DATA with corrected labels (GeoJSON OCR was noisy) ──
const RAW = [
  {x:1480,y:245,id:2,type:"ROOM",label:"1047"},{x:1411,y:265,id:3,type:"ROOM",label:"ELV 1101"},
  {x:1367,y:267,id:4,type:"ROOM",label:"ELV 1102"},{x:1291,y:261,id:5,type:"ROOM",label:"1100"},
  {x:2047,y:1018,id:6,type:"ROOM",label:"1063"},{x:1299,y:343,id:7,type:"ROOM",label:"1099"},
  {x:1411,y:371,id:8,type:"EXIT",label:"North Exit"},
  {x:2550,y:452,id:9,type:"ROOM",label:"1082"},{x:2626,y:453,id:10,type:"ROOM",label:"1083"},
  {x:1551,y:394,id:11,type:"ROOM",label:"1048"},
  {x:2735,y:391,id:13,type:"ROOM",label:"1083B"},
  {x:1295,y:447,id:21,type:"ROOM",label:"1045"},{x:2748,y:487,id:22,type:"ROOM",label:"1106"},
  {x:2713,y:433,id:23,type:"EXIT",label:"East N Exit"},
  {x:2833,y:482,id:24,type:"ROOM",label:"1119"},
  {x:2487,y:520,id:25,type:"ROOM",label:"1081"},{x:2416,y:520,id:26,type:"ROOM",label:"1080"},
  {x:2351,y:520,id:27,type:"ROOM",label:"1079"},{x:2284,y:520,id:28,type:"ROOM",label:"1076"},
  {x:2220,y:520,id:29,type:"ROOM",label:"1074"},{x:2152,y:520,id:30,type:"ROOM",label:"1073"},
  {x:2088,y:520,id:31,type:"ROOM",label:"1072"},{x:2021,y:520,id:32,type:"ROOM",label:"1071"},
  {x:1957,y:520,id:33,type:"ROOM",label:"1070"},{x:1857,y:520,id:34,type:"ROOM",label:"1068"},
  {x:1726,y:520,id:35,type:"ROOM",label:"1066"},{x:1591,y:521,id:36,type:"ROOM",label:"1065"},
  {x:1406,y:514,id:37,type:"ROOM",label:"1099B"},{x:1301,y:531,id:38,type:"ROOM",label:"1046"},
  {x:3062,y:547,id:39,type:"ROOM",label:"1108A"},{x:2826,y:551,id:40,type:"ROOM",label:"T084"},
  {x:3004,y:666,id:41,type:"ROOM",label:"1107"},{x:1292,y:601,id:42,type:"ROOM",label:"1117"},
  {x:1417,y:1014,id:43,type:"ROOM",label:"1036"},{x:2921,y:758,id:44,type:"ROOM",label:"1108B"},
  {x:2465,y:686,id:45,type:"ROOM",label:"1078"},{x:2282,y:681,id:46,type:"ROOM",label:"1077"},
  {x:2148,y:685,id:47,type:"ROOM",label:"1061A"},{x:1783,y:955,id:48,type:"ROOM",label:"1052"},
  {x:1419,y:647,id:49,type:"ROOM",label:"1049"},{x:1289,y:653,id:50,type:"ROOM",label:"1044"},
  {x:1418,y:749,id:52,type:"ROOM",label:"1049A"},
  {x:2021,y:941,id:51,type:"ROOM",label:"1052C"},{x:2194,y:948,id:54,type:"ROOM",label:"1061"},
  {x:949,y:770,id:55,type:"ROOM",label:"1110D"},{x:942,y:826,id:56,type:"ROOM",label:"1110A"},
  {x:1215,y:826,id:57,type:"ROOM",label:"1041"},{x:1289,y:784,id:58,type:"ROOM",label:"1042"},
  {x:2055,y:817,id:59,type:"ROOM",label:"1103"},{x:2612,y:769,id:60,type:"ROOM",label:"1110B"},
  {x:2480,y:954,id:61,type:"ROOM",label:"1085"},{x:1418,y:853,id:62,type:"ROOM",label:"1040"},
  {x:1289,y:848,id:63,type:"ROOM",label:"1043"},{x:1289,y:916,id:64,type:"ROOM",label:"1038"},
  {x:3040,y:947,id:65,type:"ROOM",label:"1088"},{x:2852,y:934,id:66,type:"ROOM",label:"1088A"},
  {x:1961,y:915,id:67,type:"ROOM",label:"1059"},{x:1419,y:935,id:68,type:"ROOM",label:"1039"},
  {x:954,y:943,id:69,type:"ROOM",label:"1902"},{x:1976,y:957,id:70,type:"ROOM",label:"1052B"},
  {x:1289,y:980,id:71,type:"ROOM",label:"1037"},{x:2936,y:970,id:72,type:"ROOM",label:"1108C"},
  {x:2852,y:976,id:73,type:"ROOM",label:"1110B2"},
  {x:3010,y:1152,id:74,type:"ROOM",label:"1088B"},{x:2833,y:1152,id:75,type:"ROOM",label:"1109"},
  {x:1289,y:1048,id:76,type:"ROOM",label:"1034"},{x:2055,y:1080,id:77,type:"ROOM",label:"1060A"},
  {x:1418,y:1095,id:78,type:"ROOM",label:"1035"},{x:1289,y:1112,id:79,type:"ROOM",label:"1033"},
  {x:1418,y:1173,id:80,type:"ROOM",label:"1032"},{x:2616,y:1174,id:81,type:"ROOM",label:"1060D"},
  {x:2477,y:1174,id:82,type:"ROOM",label:"1060C"},{x:2335,y:1175,id:83,type:"ROOM",label:"1060B"},
  {x:2219,y:1174,id:84,type:"ROOM",label:"1060"},
  {x:2278,y:1214,id:85,type:"ROOM",label:"1060E"},
  {x:1660,y:1280,id:86,type:"ROOM",label:"1056"},{x:1289,y:1179,id:87,type:"ROOM",label:"1031"},
  {x:1289,y:1243,id:89,type:"ROOM",label:"1030"},{x:1417,y:1313,id:90,type:"ROOM",label:"1058"},
  {x:2192,y:1299,id:91,type:"ROOM",label:"1060H"},
  {x:1289,y:1311,id:92,type:"ROOM",label:"1029"},
  {x:2919,y:1356,id:93,type:"ROOM",label:"1091"},{x:3199,y:1357,id:94,type:"ROOM",label:"1001"},
  {x:3099,y:1522,id:95,type:"ROOM",label:"1002"},
  {x:2351,y:1378,id:96,type:"ROOM",label:"1009"},{x:2285,y:1377,id:97,type:"ROOM",label:"1011"},
  {x:2156,y:1379,id:98,type:"ROOM",label:"1018"},{x:2218,y:1378,id:99,type:"ROOM",label:"1013"},
  {x:2092,y:1379,id:100,type:"ROOM",label:"1017"},
  {x:1289,y:1375,id:101,type:"ROOM",label:"1028"},
  {x:2909,y:1424,id:102,type:"ROOM",label:"1089"},
  {x:1296,y:1477,id:103,type:"ROOM",label:"1027"},
  {x:2865,y:1570,id:104,type:"ROOM",label:"1092"},
  {x:2550,y:1507,id:105,type:"ROOM",label:"1007"},{x:2483,y:1508,id:106,type:"ROOM",label:"1009B"},
  {x:2416,y:1507,id:107,type:"ROOM",label:"1095A"},{x:2352,y:1508,id:108,type:"ROOM",label:"1095B"},
  {x:2284,y:1507,id:109,type:"ROOM",label:"1095C"},{x:2220,y:1508,id:110,type:"ROOM",label:"1020"},
  {x:2152,y:1507,id:111,type:"ROOM",label:"1022"},{x:2088,y:1507,id:112,type:"ROOM",label:"1023"},
  {x:1989,y:1507,id:113,type:"ROOM",label:"1018B"},{x:1890,y:1507,id:114,type:"ROOM",label:"1024"},
  {x:1824,y:1507,id:115,type:"ROOM",label:"1026B"},{x:1758,y:1507,id:116,type:"ROOM",label:"1120"},
  {x:1694,y:1508,id:117,type:"ROOM",label:"1096"},{x:1626,y:1507,id:118,type:"ROOM",label:"1026A"},
  {x:1558,y:1507,id:119,type:"ROOM",label:"1026C"},
  {x:1414,y:1537,id:120,type:"ROOM",label:"1026"},
  {x:2693,y:1490,id:121,type:"ROOM",label:"1002B"},{x:2695,y:1566,id:122,type:"ROOM",label:"1115"},
  {x:1317,y:1623,id:123,type:"ROOM",label:"ESC"},{x:1506,y:1623,id:124,type:"ROOM",label:"1025"},
  {x:1378,y:1595,id:125,type:"EXIT",label:"West Exit (ESC)"},
  {x:2732,y:1630,id:133,type:"EXIT",label:"South Exit"},
  {x:1403,y:1637,id:134,type:"ROOM",label:"1026D"},
  {x:2702,y:1670,id:135,type:"ROOM",label:"1002A"},
  {x:2711,y:1758,id:136,type:"ROOM",label:"ELV 1094"},
  {x:2669,y:1714,id:137,type:"ROOM",label:"ELV 1093"},
  {x:2624,y:1757,id:138,type:"ROOM",label:"1092B"},{x:2558,y:1757,id:139,type:"ROOM",label:"1002C"},
];

const ROOMS = RAW.filter(r => r.type === "ROOM").map(r => ({ ...r, sx: tx(r.x), sy: ty(r.y) }));
const EXITS = RAW.filter(r => r.type === "EXIT").map(r => ({ ...r, sx: tx(r.x), sy: ty(r.y) }));

// ── WALL SEGMENTS extracted from architectural PDF ──
// Each [x1,y1,x2,y2] in GeoJSON 3× coordinate space
const WALLS_RAW=[[851,1244,949,1244],[852,204,949,204],[853,755,996,755],[853,1244,946,1244],[853,1247,946,1247],[857,730,931,730],[867,179,1024,179],[880,764,993,764],[880,767,880,801],[880,1408,909,1408],[881,1347,881,1408],[885,1347,885,1408],[893,174,1024,174],[898,487,964,487],[904,1408,904,1453],[905,1521,905,1568],[905,1622,905,1699],[905,1753,905,1831],[906,690,942,717],[906,1324,906,1370],[908,520,1004,520],[908,528,1004,528],[909,1324,909,1370],[909,1408,909,1457],[909,1521,909,1568],[909,1622,909,1699],[909,1753,909,1831],[930,228,963,228],[931,227,931,265],[934,1328,965,1328],[934,1332,1005,1332],[944,530,944,614],[946,618,946,643],[951,557,951,618],[951,557,998,557],[953,618,953,697],[957,338,957,396],[957,396,957,460],[957,1365,1166,1365],[957,1521,1050,1521],[958,1365,958,1471],[958,1520,958,1802],[959,1232,959,1272],[960,1365,1160,1365],[960,1369,1160,1369],[960,1536,960,1785],[960,1538,1055,1538],[960,1784,1229,1784],[961,1365,961,1471],[964,486,967,460],[965,1272,965,1331],[967,344,1024,331],[967,1272,967,1331],[973,1232,973,1272],[973,1521,1046,1521],[973,1524,1046,1524],[973,1535,1046,1535],[973,1538,1046,1538],[973,1784,1090,1784],[973,1786,1090,1786],[978,646,978,706],[980,719,1023,719],[983,1244,1080,1244],[985,1247,1078,1247],[990,1247,1031,1247],[990,1251,1031,1251],[994,766,1024,766],[994,1468,1160,1468],[994,1472,1166,1472],[996,755,1024,755],[997,729,1024,729],[998,557,998,625],[1004,465,1004,695],[1031,1246,1031,1331],[1033,1246,1033,1331],[1033,1247,1073,1247],[1033,1251,1073,1251],[1059,1328,1096,1328],[1059,1332,1136,1332],[1078,1538,1194,1538],[1091,1232,1091,1272],[1097,1272,1097,1331],[1099,1272,1099,1331],[1099,1328,1136,1328],[1104,1232,1105,1272],[1104,1784,1229,1784],[1104,1786,1285,1786],[1106,1535,1185,1535],[1106,1538,1185,1538],[1114,1244,1212,1244],[1117,1247,1210,1247],[1122,1247,1162,1247],[1122,1251,1162,1251],[1160,1365,1160,1471],[1162,1246,1162,1331],[1162,1365,1162,1471],[1165,1246,1165,1331],[1165,1247,1205,1247],[1165,1251,1205,1251],[1185,1534,1106,1537],[1186,1365,1296,1365],[1186,1369,1240,1369],[1186,1468,1240,1468],[1186,1472,1296,1472],[1190,1328,1228,1328],[1190,1332,1268,1332],[1223,1232,1223,1272],[1228,1272,1228,1331],[1229,1537,1229,1783],[1231,1272,1231,1331],[1232,1537,1232,1783],[1232,1784,1369,1784],[1237,1232,1237,1272],[1240,1365,1240,1471],[1242,1365,1296,1365],[1242,1369,1296,1369],[1242,1468,1296,1468],[1242,1472,1296,1472],[1246,1244,1343,1244],[1248,1247,1341,1247],[1253,1247,1294,1247],[1253,1251,1294,1251],[1266,1538,1436,1538],[1268,1328,1230,1331],[1275,1535,1352,1535],[1275,1538,1311,1538],[1285,1784,1353,1784],[1285,1786,1353,1786],[1294,1246,1294,1331],[1296,1246,1296,1331],[1296,1247,1337,1247],[1296,1251,1337,1251],[1296,1365,1242,1368],[1296,1468,1242,1471],[1320,1365,1320,1471],[1322,1328,1360,1328],[1322,1332,1400,1332],[1322,1365,1322,1471],[1337,1246,1296,1251],[1346,1365,1456,1365],[1346,1369,1400,1369],[1346,1468,1400,1468],[1346,1472,1456,1472],[1352,1534,1311,1537],[1354,1232,1354,1272],[1360,1272,1360,1331],[1362,1272,1362,1331],[1362,1328,1400,1328],[1362,1332,1400,1332],[1368,1232,1368,1272],[1370,1535,1436,1535],[1370,1538,1436,1538],[1378,862,1378,920],[1378,925,1378,982],[1378,987,1378,1045],[1378,1244,1475,1244],[1380,1247,1473,1247],[1382,864,1382,920],[1382,925,1382,982],[1382,987,1382,1044],[1384,1044,1429,1044],[1384,1048,1429,1048],[1385,1247,1426,1247],[1385,1251,1426,1251],[1400,1365,1400,1471],[1402,1365,1456,1365],[1402,1369,1456,1369],[1402,1468,1456,1468],[1402,1472,1456,1472],[1407,862,1461,862],[1408,835,1408,862],[1426,1246,1426,1331],[1428,1246,1428,1331],[1428,1247,1468,1247],[1428,1251,1468,1251],[1433,1044,1479,1044],[1433,1048,1479,1048],[1436,1534,1370,1537],[1454,1328,1491,1328],[1454,1332,1531,1332],[1456,1365,1402,1368],[1456,1468,1402,1471],[1460,835,1460,862],[1468,1246,1428,1251],[1478,1538,1715,1538],[1480,1365,1480,1471],[1482,1365,1482,1471],[1485,848,1632,848],[1485,1050,1632,1050],[1486,848,1486,1232],[1486,1050,1486,1266],[1487,848,1487,1049],[1492,1272,1492,1331],[1493,848,1632,848],[1493,849,1631,849],[1493,1003,1528,1003],[1493,1005,1528,1005],[1493,1034,1551,1034],[1493,1036,1551,1036],[1493,1043,1590,1043],[1493,1050,1632,1050],[1494,848,1494,1050],[1494,1103,1494,1164],[1494,1272,1494,1331],[1494,1328,1531,1328],[1494,1332,1531,1332],[1499,1232,1500,1272],[1501,1535,1531,1535],[1501,1538,1531,1538],[1504,1177,1534,1177],[1505,1104,1505,1177],[1505,1365,1671,1365],[1505,1369,1559,1369],[1505,1468,1559,1468],[1505,1472,1727,1472],[1516,1098,1553,1098],[1516,1104,1546,1104],[1517,1247,1600,1247],[1517,1251,1600,1251],[1521,1105,1521,1164],[1531,1328,1494,1331],[1531,1534,1501,1537],[1536,1534,1617,1534],[1536,1538,1617,1538],[1546,1104,1546,1164],[1546,1205,1624,1205],[1547,1097,1547,1205],[1551,986,1553,1042],[1553,986,1553,1042],[1553,1097,1553,1205],[1553,1198,1631,1198],[1558,1251,1558,1328],[1559,1365,1505,1368],[1559,1468,1505,1471],[1560,1251,1560,1328],[1560,1365,1560,1471],[1562,1365,1671,1365],[1562,1369,1671,1369],[1562,1468,1727,1468],[1562,1472,1727,1472],[1580,891,1625,891],[1580,1008,1625,1008],[1581,890,1581,1007],[1585,890,1585,1007],[1585,895,1625,895],[1585,1003,1625,1003],[1585,1008,1625,1008],[1585,1328,1623,1328],[1585,1332,1663,1332],[1590,864,1632,864],[1590,1035,1632,1035],[1591,863,1631,863],[1591,1036,1631,1036],[1600,1246,1517,1251],[1617,1534,1536,1537],[1618,1232,1618,1272],[1623,1272,1623,1331],[1625,863,1625,1034],[1625,1198,1625,1266],[1625,1272,1623,1331],[1626,1272,1626,1331],[1631,848,1591,862],[1631,1035,1591,1049],[1631,1198,1632,1266],[1633,1535,1705,1535],[1633,1538,1705,1538],[1639,1242,1741,1242],[1646,1249,1689,1249],[1663,1328,1625,1331],[1689,1248,1689,1331],[1691,1248,1691,1331],[1691,1249,1734,1249],[1694,1368,1694,1468],[1705,1534,1633,1537],[1717,1328,1755,1328],[1717,1332,1762,1332],[1717,1365,1764,1365],[1717,1369,1761,1369],[1727,1468,1562,1471],[1749,1232,1749,1272],[1755,1272,1755,1331],[1757,1272,1757,1331],[1761,1365,1717,1368],[1762,1365,1762,1471],[1762,1537,1762,1748],[1763,1232,1763,1272],[1763,1266,1791,1266],[1765,1365,1765,1471],[1765,1520,1765,1748],[1788,1259,1855,1259],[1791,1266,1791,1328],[1793,1259,1855,1259],[1793,1266,1793,1328],[1793,1266,1880,1266],[1813,1348,1890,1348],[1813,1521,1879,1521],[1814,1347,1814,1457],[1814,1521,1814,1568],[1814,1622,1814,1699],[1814,1753,1814,1831],[1815,1341,1890,1341],[1816,1521,1879,1521],[1816,1525,1879,1525],[1816,1660,1880,1660],[1816,1662,1880,1662],[1816,1791,1880,1791],[1816,1794,1880,1794],[1817,1521,1817,1568],[1817,1622,1817,1699],[1817,1753,1817,1831],[1818,1347,1818,1457],[1841,1348,1890,1348],[1841,1352,2004,1352],[1843,1453,2071,1458],[1855,1259,1793,1266],[1870,1244,1855,1266],[1879,1521,1981,1521],[1880,1659,1816,1662],[1880,1791,1816,1793],[1881,1232,1881,1272],[1888,1171,2134,1171],[1888,1232,1888,1272],[1890,1171,1890,1352],[1890,1353,1934,1353],[1890,1405,1949,1405],[1890,1452,1949,1452],[1891,1377,1923,1377],[1891,1404,1948,1404],[1892,1353,1892,1399],[1892,1405,1892,1452],[1894,1178,2134,1178],[1894,1345,1962,1345],[1894,1352,1962,1352],[1894,1548,1894,1641],[1894,1680,1894,1773],[1895,1171,1895,1352],[1897,1353,1897,1399],[1897,1405,1897,1452],[1897,1521,1945,1521],[1897,1529,1945,1529],[1899,1546,1899,1643],[1899,1678,1899,1775],[1901,1546,1901,1643],[1901,1678,1901,1775],[1903,1353,1903,1399],[1903,1405,1903,1452],[1909,1353,1909,1399],[1909,1405,1909,1452],[1914,1353,1914,1395],[1914,1405,1914,1452],[1920,1353,1920,1383],[1920,1405,1920,1452],[1921,1240,1921,1290],[1926,1405,1926,1452],[1927,1654,1995,1654],[1927,1668,1995,1668],[1927,1786,1995,1786],[1927,1800,1995,1800],[1928,1251,1928,1278],[1931,1370,1931,1399],[1931,1405,1931,1452],[1935,1239,1962,1239],[1936,1240,1962,1240],[1936,1377,1961,1377],[1937,1359,1937,1399],[1937,1405,1937,1452],[1942,1353,1942,1399],[1942,1405,1942,1452],[1945,1521,1945,1585],[1945,1586,2082,1586],[1948,1353,1948,1399],[1948,1405,1948,1452],[1952,1521,1981,1521],[1952,1525,1981,1525],[1952,1578,2006,1578],[1952,1586,2006,1586],[1953,1521,1953,1585],[1962,1232,2134,1232],[1962,1376,1962,1428],[1969,1232,1969,1352],[1969,1239,2093,1239],[1969,1345,2012,1345],[1969,1352,2004,1352],[1981,1521,1952,1524],[1995,1653,1927,1667],[1995,1785,1927,1799],[2005,1344,2005,1391],[2007,1521,2007,1585],[2010,1521,2010,1585],[2010,1578,2075,1578],[2010,1586,2075,1586],[2012,1344,2012,1391],[2063,1344,2063,1391],[2066,1344,2066,1457],[2071,1344,2071,1457],[2071,1352,2134,1352],[2071,1421,2111,1421],[2075,1352,2075,1421],[2078,1352,2078,1421],[2093,1232,2093,1352],[2100,1232,2100,1352],[2100,1239,2127,1239],[2100,1345,2127,1345],[2100,1352,2127,1352],[2100,1492,2100,1535],[2100,1558,2100,1585],[2103,1450,2156,1450],[2103,1512,2156,1512],[2103,1516,2156,1516],[2103,1578,2156,1578],[2103,1586,2156,1586],[2104,1492,2104,1535],[2104,1558,2104,1585],[2127,1232,2127,1352],[2134,1232,2134,1352],[2134,1345,2191,1345],[2134,1417,2134,1449],[2135,1345,2171,1345],[2135,1352,2171,1352],[2135,1374,2171,1374],[2135,1398,2171,1398],[2135,1421,2171,1421],[2141,1421,2171,1421],[2141,1429,2191,1429],[2142,1421,2142,1449],[2157,1442,2157,1585],[2164,1442,2164,1585],[2171,1344,2135,1352],[2172,1344,2172,1428],[2174,1344,2174,1428],[2184,1344,2184,1428],[2191,1344,2191,1428]];

// ── NAVIGATION GRAPH ──
const NAV_RAW = RAW.map(r => ({ id: `p${r.id}`, x: tx(r.x), y: ty(r.y), label: r.label, feat: r }));
const EXTRA = [
  {id:"cw1",x:tx(1350),y:ty(520)},{id:"cw2",x:tx(1350),y:ty(700)},{id:"cw3",x:tx(1350),y:ty(900)},
  {id:"cw4",x:tx(1350),y:ty(1100)},{id:"cw5",x:tx(1350),y:ty(1300)},{id:"cw6",x:tx(1350),y:ty(1500)},
  {id:"cn1",x:tx(1600),y:ty(520)},{id:"cn2",x:tx(1900),y:ty(520)},{id:"cn3",x:tx(2200),y:ty(520)},
  {id:"cn4",x:tx(2500),y:ty(520)},{id:"cn5",x:tx(2700),y:ty(520)},
  {id:"cm1",x:tx(1600),y:ty(950)},{id:"cm2",x:tx(1900),y:ty(950)},{id:"cm3",x:tx(2200),y:ty(950)},
  {id:"cm4",x:tx(2500),y:ty(950)},{id:"cm5",x:tx(2800),y:ty(950)},
  {id:"cs1",x:tx(1600),y:ty(1400)},{id:"cs2",x:tx(1900),y:ty(1400)},{id:"cs3",x:tx(2200),y:ty(1400)},
  {id:"cs4",x:tx(2500),y:ty(1400)},{id:"cs5",x:tx(2700),y:ty(1500)},
  {id:"vm1",x:tx(2100),y:ty(700)},{id:"vm2",x:tx(2100),y:ty(1200)},
  {id:"ve1",x:tx(2700),y:ty(700)},{id:"ve2",x:tx(2700),y:ty(1000)},{id:"ve3",x:tx(2700),y:ty(1300)},
  {id:"vee1",x:tx(3000),y:ty(700)},{id:"vee2",x:tx(3000),y:ty(1000)},{id:"vee3",x:tx(3000),y:ty(1400)},
  {id:"se1",x:tx(2700),y:ty(1700)},
];
const NODES = [...NAV_RAW, ...EXTRA];
const NM = {}; NODES.forEach(n => NM[n.id] = n);

const EDGES = [
  ["cw1","cw2"],["cw2","cw3"],["cw3","cw4"],["cw4","cw5"],["cw5","cw6"],
  ["cw1","cn1"],["cn1","cn2"],["cn2","cn3"],["cn3","cn4"],["cn4","cn5"],
  ["cw3","cm1"],["cm1","cm2"],["cm2","cm3"],["cm3","cm4"],["cm4","cm5"],
  ["cw5","cs1"],["cs1","cs2"],["cs2","cs3"],["cs3","cs4"],["cs4","cs5"],
  ["cn2","vm1"],["vm1","cm2"],["cm2","vm2"],["vm2","cs2"],["cn3","vm1"],["cm3","vm2"],
  ["cn5","ve1"],["ve1","ve2"],["ve2","ve3"],["ve3","cs5"],
  ["cn4","ve1"],["cm4","ve2"],["cs4","ve3"],
  ["ve1","vee1"],["vee1","vee2"],["vee2","vee3"],["vee3","ve3"],["cm5","ve2"],["cm5","vee2"],
  ["cs5","se1"],["ve3","se1"],
  ["p38","cw1"],["p21","cw1"],["p42","cw2"],["p49","cw2"],["p50","cw2"],
  ["p58","cw2"],["p52","cw2"],["p62","cw3"],["p63","cw3"],["p64","cw3"],["p68","cw3"],
  ["p43","cw4"],["p71","cw3"],["p76","cw4"],["p78","cw4"],["p79","cw4"],
  ["p80","cw5"],["p87","cw5"],["p89","cw5"],["p90","cw5"],["p92","cw5"],
  ["p101","cw5"],["p103","cw6"],["p120","cw6"],
  ["p2","cw1"],["p3","cw1"],["p4","cw1"],["p5","cw1"],["p7","cw1"],["p11","cn1"],["p37","cw1"],
  ["p36","cn1"],["p35","cn1"],["p34","cn2"],["p33","cn2"],["p32","cn2"],
  ["p31","cn3"],["p30","cn3"],["p29","cn3"],["p28","cn3"],["p27","cn3"],
  ["p26","cn4"],["p25","cn4"],["p9","cn4"],["p10","cn5"],
  ["p47","vm1"],["p46","vm1"],["p45","cm3"],["p45","vm1"],
  ["p48","cm1"],["p48","cm2"],["p51","cm2"],["p54","cm3"],
  ["p67","cm2"],["p70","cm2"],["p6","cm2"],
  ["p61","cm4"],["p77","vm2"],["p91","vm2"],
  ["p82","vm2"],["p83","vm2"],["p84","vm2"],["p81","vm2"],["p85","vm2"],
  ["p86","cs1"],["p86","cm1"],
  ["p100","cs2"],["p98","cs2"],["p99","cs3"],["p97","cs3"],["p96","cs3"],
  ["p105","cs4"],["p106","cs4"],["p107","cs3"],["p108","cs3"],["p109","cs3"],
  ["p110","cs2"],["p111","cs2"],["p112","cs2"],["p113","cs2"],["p114","cs1"],
  ["p115","cs1"],["p116","cs1"],["p117","cs1"],["p118","cs1"],["p119","cs1"],
  ["p13","cn5"],["p22","cn5"],["p24","cn5"],
  ["p39","vee1"],["p40","ve1"],["p41","vee1"],
  ["p44","vee2"],["p60","ve1"],
  ["p65","vee2"],["p66","vee2"],["p72","vee2"],["p73","vee2"],
  ["p74","vee3"],["p75","vee3"],
  ["p93","vee3"],["p94","vee3"],["p102","vee3"],
  ["p104","se1"],["p95","vee3"],["p59","vm1"],
  ["p55","cw2"],["p56","cw2"],["p57","cw2"],["p69","cw3"],
  ["p8","cw1"],["p23","cn5"],["p125","cw6"],["p133","se1"],
  ["p121","cs5"],["p122","cs5"],["p135","se1"],["p136","se1"],
  ["p137","se1"],["p138","se1"],["p139","se1"],
  ["p123","cw6"],["p124","cw6"],["p134","cw6"],
];
const EX_IDS = ["p8","p23","p125","p133"];

// ── PATHFINDING (A*) ──
const dist = (a,b) => Math.sqrt((a.x-b.x)**2+(a.y-b.y)**2);
function astar(s,e,bl=[]) {
  if(!NM[s]||!NM[e]) return null;
  const adj={}; NODES.forEach(n=>adj[n.id]=[]);
  EDGES.forEach(([a,b])=>{if(!bl.includes(`${a}-${b}`)&&!bl.includes(`${b}-${a}`)){adj[a]?.push(b);adj[b]?.push(a);}});
  const open=new Set([s]),from={},g={},f={};
  NODES.forEach(n=>{g[n.id]=1/0;f[n.id]=1/0;});
  g[s]=0;f[s]=dist(NM[s],NM[e]);
  while(open.size){let c=null,mf=1/0;for(const id of open)if(f[id]<mf){mf=f[id];c=id;}
    if(c===e){const p=[c];let x=c;while(from[x]){x=from[x];p.unshift(x);}return p;}
    open.delete(c);for(const nb of adj[c]||[]){const t=g[c]+dist(NM[c],NM[nb]);if(t<g[nb]){from[nb]=c;g[nb]=t;f[nb]=t+dist(NM[nb],NM[e]);open.add(nb);}}}
  return null;
}

function speak(t){if("speechSynthesis"in window){window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(t);u.rate=1.1;window.speechSynthesis.speak(u);}}

// ── GLOBAL BRAIN (shared state for multi-user routing) ──
const brain=(()=>{let users=new Map(),blocks=[];return{
  addBlock(e,by){if(!blocks.find(b=>b.edge===e))blocks.push({edge:e,by,time:Date.now()});return[...blocks];},
  rmBlock(e){blocks=blocks.filter(b=>b.edge!==e);return[...blocks];},
  clearBlocks(){blocks=[];return[];},
  blocked(){return blocks.map(b=>b.edge);},
  blocks(){return[...blocks];},
  cong(){const c={};NODES.forEach(n=>c[n.id]=0);for(const[,u]of users)(u.path||[]).forEach(id=>c[id]=(c[id]||0)+1);return c;},
  route(start,uid){
    const bl=this.blocked(),co=this.cong();let best=null,bs=1/0;
    for(const ex of EX_IDS){const p=astar(start,ex,bl);if(p){let d=0,cp=0;for(let i=1;i<p.length;i++){d+=dist(NM[p[i-1]],NM[p[i]]);cp+=(co[p[i]]||0)*40;}if(d+cp<bs){bs=d+cp;best=p;}}}
    if(best)users.set(uid,{nodeId:start,path:best});return best;},
  localRoute(start){const bl=this.blocked();let best=null,bd=1/0;for(const ex of EX_IDS){const p=astar(start,ex,bl);if(p){let d=0;for(let i=1;i<p.length;i++)d+=dist(NM[p[i-1]],NM[p[i]]);if(d<bd){bd=d;best=p;}}}return best;},
  rerouteAll(){const r=[];for(const[id,u]of users){const p=this.route(u.nodeId,id);if(p)r.push(id);}return r;},
  count(){return users.size;},
  seed(n){const ss=NAV_RAW.filter(r=>r.feat?.type==="ROOM").slice(0,n).map(r=>r.id);for(let i=0;i<n;i++)this.route(ss[i%ss.length],`s${i}`);},
};})();

/* ─── SVG FLOOR PLAN COMPONENT ─── */
const FloorPlan = ({ userPos, route, blockades, congestion, onClick, people, hoveredRoom, setHoveredRoom, earthquakeAlerts, locationCell }) => {
  const rp = route ? route.map(id => NM[id]).filter(Boolean) : [];
  
  // Convert wall segments to SVG space
  const wallLines = useMemo(() => WALLS_RAW.map(([x1,y1,x2,y2]) => ({
    x1: tx(x1), y1: ty(y1), x2: tx(x2), y2: ty(y2)
  })), []);

  return (
    <svg viewBox="0 0 1200 820" preserveAspectRatio="xMidYMid meet"
      style={{ width: "100%", height: "100%", background: "#060a10", borderRadius: 12, display: "block" }}>
      <defs>
        <filter id="gl"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        <filter id="gs"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        <linearGradient id="rg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#00ffaa"/><stop offset="100%" stopColor="#00aaff"/></linearGradient>
        <pattern id="grd" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0L0 0 0 20" fill="none" stroke="#ffffff03" strokeWidth=".3"/></pattern>
      </defs>
      <rect width="1200" height="820" fill="url(#grd)"/>

      {/* ═══ ACTUAL FLOOR PLAN WALLS from PDF ═══ */}
      {wallLines.map((w, i) => (
        <line key={i} x1={w.x1} y1={w.y1} x2={w.x2} y2={w.y2}
          stroke="#1a2a4060" strokeWidth="1" strokeLinecap="round"/>
      ))}

      {/* Rooms */}
      {ROOMS.map(r => {
        const isHovered = hoveredRoom === r.label;
        return (
          <g key={r.id} style={{ cursor: "pointer" }}
            onClick={() => onClick(NAV_RAW.find(n => n.feat?.id === r.id))}
            onMouseEnter={() => setHoveredRoom(r.label)}
            onMouseLeave={() => setHoveredRoom(null)}>
            <circle cx={r.sx} cy={r.sy} r={isHovered ? 14 : 10} fill={isHovered ? "#1a2f4a" : "#141a2880"} stroke={isHovered ? "#3b82f640" : "#1a254020"} strokeWidth={isHovered ? 1 : .5} />
            <circle cx={r.sx} cy={r.sy} r="3.5" fill={isHovered ? "#3b82f6" : "#1e2a3a"} stroke="#2a3f5f30" strokeWidth=".5"/>
            <text x={r.sx} y={r.sy-9} textAnchor="middle" fill={isHovered ? "#93c5fd" : "#4a5a70"} fontSize="5.5" fontFamily="monospace" fontWeight={isHovered ? "bold" : "normal"}>{r.label}</text>
          </g>
        );
      })}

      {/* Exits */}
      {EXITS.map(e => (
        <g key={e.id} filter="url(#gl)">
          <circle cx={e.sx} cy={e.sy} r="8" fill="#00ff8830" stroke="#00ff88" strokeWidth="1.5">
            <animate attributeName="r" values="8;13;8" dur="2s" repeatCount="indefinite"/>
            <animate attributeName="opacity" values="1;.3;1" dur="2s" repeatCount="indefinite"/>
          </circle>
          <circle cx={e.sx} cy={e.sy} r="4" fill="#00ff88"/>
          <text x={e.sx} y={e.sy-13} textAnchor="middle" fill="#00ff88" fontSize="6" fontFamily="monospace" fontWeight="bold">EXIT</text>
          <text x={e.sx} y={e.sy+16} textAnchor="middle" fill="#00ff8880" fontSize="4.5" fontFamily="monospace">{e.label}</text>
        </g>
      ))}

      {/* Congestion */}
      {congestion && Object.entries(congestion).map(([nid, lv]) => {
        const n = NM[nid]; if (!n || lv < 2) return null;
        return <circle key={`c${nid}`} cx={n.x} cy={n.y} r={5+lv*3} fill={lv>5?"#ff000022":lv>3?"#ff880018":"#ffff0012"}/>;
      })}

      {/* EARTHQUAKE ALERTS (Location Cells) */}
      {earthquakeAlerts && earthquakeAlerts.map((alert, i) => {
        const bounds = LocationCellGrid.getCellBounds(alert.cellId);
        if (!bounds) return null;
        const isCurrentCell = locationCell === alert.cellId;
        return (
          <g key={`eq${i}`} filter={isCurrentCell ? "url(#gs)" : ""}>
            <rect
              x={bounds.x1}
              y={bounds.y1}
              width={bounds.x2 - bounds.x1}
              height={bounds.y2 - bounds.y1}
              fill={isCurrentCell ? "#ff000044" : "#ff880033"}
              stroke={isCurrentCell ? "#ff0000" : "#ff8800"}
              strokeWidth={isCurrentCell ? "2" : "1"}
              opacity={isCurrentCell ? 0.8 : 0.5}
            >
              <animate attributeName="opacity" values={isCurrentCell ? "0.8;0.4;0.8" : "0.5;0.2;0.5"} dur="1.5s" repeatCount="indefinite" />
            </rect>
            <text
              x={(bounds.x1 + bounds.x2) / 2}
              y={(bounds.y1 + bounds.y2) / 2 - 8}
              textAnchor="middle"
              fill={isCurrentCell ? "#ff0000" : "#ff8800"}
              fontSize={isCurrentCell ? "8" : "6"}
              fontWeight="bold"
              fontFamily="monospace"
            >
              ⚡ {alert.deviceCount}
            </text>
            <text
              x={(bounds.x1 + bounds.x2) / 2}
              y={(bounds.y1 + bounds.y2) / 2 + 8}
              textAnchor="middle"
              fill={isCurrentCell ? "#ff6666" : "#ffaa66"}
              fontSize="5"
              fontFamily="monospace"
            >
              {Math.round(alert.avgIntensity * 10) / 10}g
            </text>
          </g>
        );
      })}

      {/* Location cell grid (faint) */}
      {LocationCellGrid.renderGrid(0.02)}

      {/* Blockades */}
      {blockades.map((b, i) => {
        const ps = b.edge.split("-"), n1 = NM[ps[0]], n2 = NM[ps[1]];
        if (!n1 || !n2) return null;
        const mx = (n1.x + n2.x) / 2, my = (n1.y + n2.y) / 2;
        return (
          <g key={`b${i}`}>
            <line x1={n1.x} y1={n1.y} x2={n2.x} y2={n2.y} stroke="#ff000050" strokeWidth="3" strokeDasharray="5 3"/>
            <circle cx={mx} cy={my} r="10" fill="#ff000025" stroke="#ff3333" strokeWidth="1.5" filter="url(#gl)">
              <animate attributeName="r" values="10;14;10" dur="1.5s" repeatCount="indefinite"/>
            </circle>
            <text x={mx} y={my+1} textAnchor="middle" dominantBaseline="middle" fill="#ff4444" fontSize="12" fontWeight="bold">✕</text>
          </g>
        );
      })}

      {/* People */}
      {people.map((p, i) => <g key={`sp${i}`}><circle cx={p.x} cy={p.y} r="3" fill="#3366cc35"/><circle cx={p.x} cy={p.y} r="1.2" fill="#5588ee50"/></g>)}

      {/* Route */}
      {rp.length > 1 && <g filter="url(#gs)">
        <polyline points={rp.map(p => `${p.x},${p.y}`).join(" ")} fill="none" stroke="url(#rg)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="10 5">
          <animate attributeName="stroke-dashoffset" from="0" to="-15" dur=".5s" repeatCount="indefinite"/>
        </polyline>
        {rp.slice(1, -1).map((p, i) => <circle key={`r${i}`} cx={p.x} cy={p.y} r="2.5" fill="#00ffaa" opacity=".5"/>)}
      </g>}

      {/* User position */}
      {userPos && <g filter="url(#gs)">
        <circle cx={userPos.x} cy={userPos.y} r="16" fill="#00aaff08" stroke="#00aaff" strokeWidth=".8">
          <animate attributeName="r" values="12;22;12" dur="2s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values=".6;.12;.6" dur="2s" repeatCount="indefinite"/>
        </circle>
        <circle cx={userPos.x} cy={userPos.y} r="6" fill="#00ccff"/>
        <circle cx={userPos.x} cy={userPos.y} r="2.5" fill="#fff"/>
      </g>}

      {/* Destination */}
      {route && rp.length > 0 && <g filter="url(#gl)">
        <circle cx={rp[rp.length-1].x} cy={rp[rp.length-1].y} r="10" fill="none" stroke="#00ff88" strokeWidth="2">
          <animate attributeName="r" values="10;17;10" dur="1.5s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="1;.2;1" dur="1.5s" repeatCount="indefinite"/>
        </circle>
      </g>}

      <text x="18" y="810" fill="#1a2a4050" fontSize="7" fontFamily="monospace">MC Building No.17 — 1st Floor — University of Waterloo — EchoAid GeoJSON</text>
    </svg>
  );
};

/* ═══════════════════════════════════════
   MAIN APP — ECHOAID
   ═══════════════════════════════════════ */
export default function App() {
  const [status, setStatus] = useState("STANDBY");
  const [uPos, setUPos] = useState(null);
  const [uNode, setUNode] = useState(null);
  const [route, setRoute] = useState(null);
  const [wifi, setWifi] = useState(true);
  const [logs, setLogs] = useState([]);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [blocks, setBlocks] = useState([]);
  const [cong, setCong] = useState({});
  const [people, setPeople] = useState([]);
  const [prog, setProg] = useState(0);
  const [showBM, setShowBM] = useState(false);
  const [hoveredRoom, setHoveredRoom] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Earthquake detection
  const [earthquakeEnabled, setEarthquakeEnabled] = useState(false);
  const [earthquakeSensitivity, setEarthquakeSensitivity] = useState(2); // 1-3
  const [earthquakeAlerts, setEarthquakeAlerts] = useState([]);
  const [earthquakeStats, setEarthquakeStats] = useState(null);
  const [lastShakingEvents, setLastShakingEvents] = useState([]);
  const [eqConfig, setEqConfig] = useState({
    N_DEVICES: 3,
    T_WINDOW: 4000,
  });
  const [earthquakeTriggered, setEarthquakeTriggered] = useState(false);
  
  const recRef = useRef(null);
  const logRef = useRef(null);
  const eqRefreshRef = useRef(null);

  const log = useCallback((m, t = "info") => {
    const d = new Date();
    const ts = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
    setLogs(p => [...p.slice(-60), { msg: m, type: t, time: ts }]);
  }, []);
  useEffect(() => { logRef.current && (logRef.current.scrollTop = logRef.current.scrollHeight); }, [logs]);
  useEffect(() => {
    brain.seed(20); setCong(brain.cong());
    const pp = []; const rn = NODES.filter(n => n.id.startsWith("p"));
    for (let i = 0; i < 25; i++) { const n = rn[Math.floor(Math.random() * rn.length)]; pp.push({ x: n.x + (Math.random() - .5) * 15, y: n.y + (Math.random() - .5) * 10 }); }
    setPeople(pp);
    log("EchoAid initialized — MC Building floor plan loaded from PDF", "success");
    log(`${NODES.length} nodes, ${EDGES.length} edges, ${WALLS_RAW.length} wall segments`, "info");
    log("20 simulated evacuees registered with Global Brain.", "info");
    log("🚨 Earthquake crowd sensing available — enable in controls", "info");
  }, [log]);

  // Earthquake detection handler
  const currentLocationCell = useMemo(() => {
    return uPos ? LocationCellGrid.getCellId(uPos.x, uPos.y) : null;
  }, [uPos]);

  const handleShakingDetected = useCallback((shakingEvent) => {
    // Submit to earthquake network
    const report = {
      ...shakingEvent,
      deviceId: `phone_${Math.random().toString(36).substr(2, 5)}`, // Simulate device ID
    };
    
    const event = EarthquakeEventNetwork.reportShaking(report);
    if (event) {
      setLastShakingEvents(prev => [event, ...prev].slice(0, 20));
      log(`📊 Earthquake: ${shakingEvent.intensity.toFixed(1)}g in ${shakingEvent.locationCell}`, "info");
    }

    // Check if alert was triggered
    const alert = EarthquakeEventNetwork.getAlertForCell(shakingEvent.locationCell);
    const allAlerts = EarthquakeEventNetwork.getAlerts();
    setEarthquakeAlerts(allAlerts);

    if (alert && !earthquakeTriggered) {
      setEarthquakeTriggered(true);
      log(`🚨🚨 EARTHQUAKE ALERT: ${alert.deviceCount} devices detected shaking! Confidence: ${alert.confidence.toFixed(0)}%`, "error");
      speak(`Earthquake detected! ${alert.deviceCount} devices confirmed. Evacuate immediately.`);
      
      // Auto-trigger evacuation
      if (uNode) {
        setTimeout(() => {
          setStatus("EVACUATING");
          setProg(0);
          const p = brain.route(uNode, "main");
          if (p) {
            setRoute(p);
            log("🚨 AUTO-EVACUATION TRIGGERED by earthquake network", "error");
            speak("Automatic evacuation route activated.");
          }
        }, 500);
      }
    }

    // Update stats
    const stats = EarthquakeEventNetwork.getStats();
    setEarthquakeStats(stats);
  }, [uNode, earthquakeTriggered, log]);

  const handleEarthquakeToggle = useCallback(() => {
    if (!earthquakeEnabled) {
      log("📡 Earthquake detection: ENABLED", "success");
      speak("Earthquake detection activated.");
    } else {
      log("📡 Earthquake detection: DISABLED", "warn");
      EarthquakeEventNetwork.reset();
      setEarthquakeAlerts([]);
      setLastShakingEvents([]);
      setEarthquakeTriggered(false);
    }
    setEarthquakeEnabled(!earthquakeEnabled);
  }, [earthquakeEnabled, log]);

  const updateEqConfig = useCallback((key, value) => {
    const newConfig = { ...eqConfig, [key]: value };
    setEqConfig(newConfig);
    EarthquakeEventNetwork.setConfig(newConfig);
    log(`⚙️ Earthquake config: ${key} = ${value}`, "info");
  }, [eqConfig, log]);

  // Simulate random earthquake events for testing
  const simulateEarthquake = useCallback(() => {
    const cells = LocationCellGrid.getAllCells().slice(5, 25);
    for (let i = 0; i < 4; i++) {
      const cell = cells[Math.floor(Math.random() * cells.length)];
      setTimeout(() => {
        const event = {
          timestamp: Date.now() + i * 500,
          locationCell: cell,
          intensity: 3.5 + Math.random() * 2,
          deviceId: `sim_${i}`,
          features: {},
        };
        // Process through the normal handler to trigger evacuation
        handleShakingDetected(event);
        setLastShakingEvents(prev => [event, ...prev].slice(0, 20));
      }, i * 200);
    }
    log("🔬 Simulated earthquake event injected (4 devices)", "warn");
  }, [log, handleShakingDetected]);

  const evac = useCallback((nid) => {
    setStatus("EVACUATING"); setProg(0);
    const p = wifi ? brain.route(nid, "main") : brain.localRoute(nid);
    log(wifi ? "🌐 Global Brain: congestion-aware routing..." : "📶 Local Brain: nearest exit...", "route");
    if (p) {
      setRoute(p);
      const last = NM[p[p.length-1]];
      const ex = EXITS.find(e => Math.abs(e.sx - last.x) < 20 && Math.abs(e.sy - last.y) < 20);
      const en = ex ? ex.label : "nearest exit";
      log(`✅ Route: ${p.length} waypoints → ${en}`, "success");
      speak(`Route calculated. Head towards ${en}.`);
      setCong(brain.cong());
    } else {
      log("⚠ No route found!", "error");
      speak("Warning. No route found.");
    }
  }, [wifi, log]);

  const onNode = useCallback(n => {
    if (!n) return;
    setUNode(n.id); setUPos({ x: n.x, y: n.y });
    log(`📍 Location set: ${n.label || n.id}`);
    if (status === "EVACUATING") evac(n.id);
  }, [status, evac, log]);

  const doEvac = useCallback(() => {
    if (!uNode) { const d = "p48"; setUNode(d); setUPos({ x: NM[d].x, y: NM[d].y }); log("Auto-placed in MC 1052.", "warn"); evac(d); }
    else evac(uNode);
  }, [uNode, evac, log]);

  const doBlock = useCallback(() => {
    if (!route || route.length < 3) { log("Need active route.", "warn"); return; }
    const idx = Math.min(prog + 1, route.length - 2);
    const edge = `${route[idx]}-${route[idx+1]}`;
    brain.addBlock(edge, "you"); setBlocks(brain.blocks());
    log(`⛔ Blockade: ${edge}`, "error"); speak("Blockade reported.");
    const rr = brain.rerouteAll(); log(`🔄 ${rr.length} rerouted.`, "route");
    setCong(brain.cong());
    if (uNode) setTimeout(() => evac(uNode), 300);
  }, [route, prog, uNode, evac, log]);

  const rmBlock = useCallback(edge => {
    brain.rmBlock(edge); setBlocks(brain.blocks());
    log(`✅ Cleared: ${edge}`, "success"); speak("Blockade cleared.");
    brain.rerouteAll(); setCong(brain.cong());
    if (uNode && status === "EVACUATING") setTimeout(() => evac(uNode), 300);
  }, [uNode, status, evac, log]);

  const clearAll = useCallback(() => {
    brain.clearBlocks(); setBlocks([]);
    log("✅ All blockades cleared.", "success"); speak("All blockades cleared.");
    brain.rerouteAll(); setCong(brain.cong());
    if (uNode && status === "EVACUATING") setTimeout(() => evac(uNode), 300);
  }, [uNode, status, evac, log]);

  const doSafe = useCallback(() => { setStatus("SAFE"); setRoute(null); log("✅ SAFE.", "success"); speak("You are safe."); }, [log]);

  // Voice recognition
  const startListen = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { log("No speech recognition.", "error"); return; }
    const r = new SR(); r.continuous = false; r.interimResults = false; r.lang = "en-US";
    r.onresult = e => {
      const t = e.results[0][0].transcript.toLowerCase(); setTranscript(t); log(`🎤 "${t}"`);
      if (t.includes("fire") || t.includes("emergency")) doEvac();
      else if (t.includes("clear") && t.includes("block")) clearAll();
      else if (t.includes("block")) doBlock();
      else if (t.includes("evacuate") || t.includes("help")) doEvac();
      else if (t.includes("safe")) doSafe();
      else { log("Command not recognized.", "warn"); }
    };
    r.onerror = e => { log(`Voice: ${e.error}`, "error"); setListening(false); };
    r.onend = () => setListening(false);
    r.start(); recRef.current = r; setListening(true); log("🎤 Listening...");
  }, [doEvac, doBlock, clearAll, doSafe, log]);

  // Evacuation step timer
  useEffect(() => {
    if (status !== "EVACUATING" || !route || route.length < 2) return;
    const iv = setInterval(() => {
      setProg(p => {
        const n = p + 1;
        if (n >= route.length - 1) { clearInterval(iv); doSafe(); return p; }
        const nn = NM[route[n]]; if (nn) { setUPos({ x: nn.x, y: nn.y }); setUNode(route[n]); }
        if (n === Math.floor(route.length / 2)) speak("Halfway there.");
        return n;
      });
    }, 1800);
    return () => clearInterval(iv);
  }, [status, route]);

  // Room search
  const filteredRooms = searchQuery
    ? ROOMS.filter(r => r.label.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 8)
    : [];

  const sc = status === "EVACUATING" ? "#ff4444" : status === "SAFE" ? "#00ff88" : "#00aaff";

  return (
    <div style={{ minHeight: "100vh", background: "#060a10", color: "#c0d0e0", fontFamily: "'IBM Plex Sans',sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap');@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}*{box-sizing:border-box;margin:0;padding:0}::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:#0a0e14}::-webkit-scrollbar-thumb{background:#1a2a40;border-radius:4px}`}</style>

      {/* HEADER */}
      <header style={{ background: "#0a0e17", borderBottom: "1px solid #1a2a40", padding: "10px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: status === "EVACUATING" ? "linear-gradient(135deg,#ff2200,#ff6600)" : status === "SAFE" ? "linear-gradient(135deg,#00cc66,#00ff88)" : "linear-gradient(135deg,#0066ff,#00aaff)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, boxShadow: `0 0 20px ${sc}40` }}>
            {status === "EVACUATING" ? "🚨" : status === "SAFE" ? "✅" : "🏢"}
          </div>
          <div>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, fontSize: 16, color: "#e0eeff", letterSpacing: 1.5 }}>
              ECHO<span style={{ color: "#00aaff" }}>AID</span>
            </div>
            <div style={{ fontSize: 9, color: "#445566", fontFamily: "monospace" }}>MC Building No.17 — UWaterloo — Real Floor Plan Data</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: sc, boxShadow: `0 0 8px ${sc}`, animation: status === "EVACUATING" ? "pulse 1s infinite" : "none" }} />
            <span style={{ color: sc, fontFamily: "'JetBrains Mono',monospace", fontSize: 11, fontWeight: 700, letterSpacing: 2 }}>{status}</span>
          </div>
          <span style={{ color: "#334455", fontSize: 10, fontFamily: "monospace" }}>
            {wifi ? "📡 Global" : "📶 Local"} · {brain.count() + 1} users · {blocks.length} blocks · {WALLS_RAW.length} walls
          </span>
        </div>
      </header>

      <div style={{ padding: "14px 20px", maxWidth: 1600, margin: "0 auto" }}>
        {/* MAP */}
        <div style={{ background: "#0a0e17", border: "1px solid #1a2a40", borderRadius: 12, padding: 12, marginBottom: 14 }}>
          <FloorPlan userPos={uPos} route={route} blockades={blocks} congestion={cong} onClick={onNode} people={people} hoveredRoom={hoveredRoom} setHoveredRoom={setHoveredRoom} earthquakeAlerts={earthquakeAlerts} locationCell={currentLocationCell} />
          {route && <div style={{ marginTop: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ color: "#556677", fontSize: 11, fontFamily: "monospace" }}>Evacuation Progress</span>
              <span style={{ color: "#00ff88", fontSize: 11, fontFamily: "monospace", fontWeight: 600 }}>{Math.round(prog / (route.length - 1) * 100)}%</span>
            </div>
            <div style={{ height: 4, background: "#1a2a40", borderRadius: 2, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${prog / (route.length - 1) * 100}%`, background: "linear-gradient(90deg,#00ffaa,#00aaff)", transition: "width .5s" }} />
            </div>
          </div>}
        </div>

        {/* CONTROLS GRID */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
          {/* Room Search + Actions */}
          <div style={{ background: "#0d1117", border: "1px solid #1a2a40", borderRadius: 10, padding: 14 }}>
            <div style={{ color: "#8899bb", fontSize: 10, fontFamily: "monospace", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>📍 Find Your Room</div>
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search room (e.g. 1052, 1047...)" style={{ width: "100%", padding: "8px 12px", borderRadius: 7, border: "1px solid #1a2a40", background: "#0a0e14", color: "#c0d0e0", fontFamily: "'JetBrains Mono',monospace", fontSize: 11, outline: "none", marginBottom: 6 }} />
            {filteredRooms.length > 0 && (
              <div style={{ maxHeight: 120, overflowY: "auto", marginBottom: 8 }}>
                {filteredRooms.map(r => (
                  <div key={r.id} onClick={() => { onNode(NAV_RAW.find(n => n.feat?.id === r.id)); setSearchQuery(""); }}
                    style={{ padding: "5px 10px", cursor: "pointer", borderRadius: 4, fontSize: 11, fontFamily: "monospace", color: "#7799bb", background: hoveredRoom === r.label ? "#1a2a40" : "transparent" }}
                    onMouseEnter={() => setHoveredRoom(r.label)} onMouseLeave={() => setHoveredRoom(null)}>
                    {r.label} <span style={{ color: "#334455", fontSize: 9 }}>({r.x}, {r.y})</span>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 6 }}>
              <button onClick={doEvac} style={{ padding: 12, borderRadius: 8, border: "none", cursor: "pointer", background: status === "EVACUATING" ? "linear-gradient(135deg,#cc2200,#ff4400)" : "linear-gradient(135deg,#0055cc,#0088ff)", color: "#fff", fontFamily: "'JetBrains Mono',monospace", fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>
                {status === "EVACUATING" ? "🚨 REROUTE" : "🚀 EVACUATE"}
              </button>
              <button onClick={doBlock} style={{ padding: 12, borderRadius: 8, border: "1px solid #ff444040", background: "#ff111110", color: "#ff6666", fontFamily: "'JetBrains Mono',monospace", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>⛔ BLOCKADE</button>
            </div>
          </div>

          {/* Voice + Commands */}
          <div style={{ background: "#0d1117", border: "1px solid #1a2a40", borderRadius: 10, padding: 14 }}>
            <div style={{ color: "#8899bb", fontSize: 10, fontFamily: "monospace", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>🎙️ Voice Control & Commands</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <div onClick={() => listening ? (recRef.current?.stop(), setListening(false)) : startListen()}
                style={{ width: 36, height: 36, borderRadius: "50%", background: listening ? "#ff444430" : "#1a2a40", border: `2px solid ${listening ? "#ff4444" : "#2a3f5f"}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 16 }}>
                {listening ? "🔴" : "🎙️"}
              </div>
              <div>
                <div style={{ color: "#8899bb", fontSize: 10, fontFamily: "monospace", textTransform: "uppercase", letterSpacing: 1 }}>Voice Control</div>
                <div style={{ color: listening ? "#ff6666" : "#445566", fontSize: 9, fontFamily: "monospace" }}>{listening ? "Listening..." : "Tap to speak"}</div>
              </div>
            </div>
            {transcript && <div style={{ background: "#0a0e14", borderRadius: 6, padding: "5px 10px", color: "#6688aa", fontSize: 10, fontFamily: "monospace", fontStyle: "italic", marginBottom: 6 }}>"{transcript}"</div>}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {["Report fire", "Report blockade", "Help evacuate", "Clear blockade", "I'm safe"].map(c => (
                <button key={c} onClick={() => { setTranscript(c); log(`Cmd: "${c}"`); if (c.includes("fire")) doEvac(); else if (c === "Report blockade") doBlock(); else if (c === "Clear blockade") clearAll(); else if (c.includes("evacuate")) doEvac(); else doSafe(); }}
                  style={{ background: "#1a2230", border: "1px solid #2a3a50", borderRadius: 5, padding: "4px 8px", color: "#7799bb", fontSize: 9, fontFamily: "monospace", cursor: "pointer" }}>{c}</button>
              ))}
            </div>
          </div>

          {/* EARTHQUAKE DETECTION */}
          <div style={{ background: "#0d1117", border: `1px solid ${earthquakeEnabled ? "#ff6644" : "#1a2a40"}`, borderRadius: 10, padding: 14 }}>
            <div style={{ color: earthquakeEnabled ? "#ff8844" : "#8899bb", fontSize: 10, fontFamily: "monospace", letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }}>⚡ Earthquake Crowd Sensing</div>
            
            <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
              <button onClick={handleEarthquakeToggle} style={{ padding: "8px 14px", borderRadius: 7, border: `1px solid ${earthquakeEnabled ? "#ff6644" : "#1a2a40"}`, background: earthquakeEnabled ? "#ff664415" : "#0a0e14", color: earthquakeEnabled ? "#ff8844" : "#556677", fontFamily: "'JetBrains Mono',monospace", fontSize: 10, cursor: "pointer", fontWeight: earthquakeEnabled ? 600 : 400 }}>
                {earthquakeEnabled ? "✓ ACTIVE" : "○ INACTIVE"}
              </button>
              {earthquakeEnabled && (
                <button onClick={simulateEarthquake} style={{ padding: "8px 14px", borderRadius: 7, border: "1px solid #ff880040", background: "#ff880010", color: "#ffaa66", fontFamily: "'JetBrains Mono',monospace", fontSize: 10, cursor: "pointer", fontWeight: 500 }}>
                  🔬 TEST SHAKE
                </button>
              )}
            </div>

            {earthquakeEnabled && (
              <div style={{ background: "#0a0e14", borderRadius: 6, padding: 8, marginBottom: 8 }}>
                <div style={{ color: "#8899bb", fontSize: 9, fontFamily: "monospace", marginBottom: 6 }}>Configuration:</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 6 }}>
                  <div>
                    <label style={{ color: "#556677", fontSize: 8, fontFamily: "monospace", display: "block", marginBottom: 2 }}>Min Devices</label>
                    <input type="number" min="2" max="10" value={eqConfig.N_DEVICES} onChange={(e) => updateEqConfig("N_DEVICES", parseInt(e.target.value))}
                      style={{ width: "100%", padding: "4px 6px", borderRadius: 4, border: "1px solid #1a2a40", background: "#0a0e14", color: "#c0d0e0", fontFamily: "monospace", fontSize: 10 }} />
                  </div>
                  <div>
                    <label style={{ color: "#556677", fontSize: 8, fontFamily: "monospace", display: "block", marginBottom: 2 }}>Time Window (ms)</label>
                    <input type="number" min="2000" max="10000" step="500" value={eqConfig.T_WINDOW} onChange={(e) => updateEqConfig("T_WINDOW", parseInt(e.target.value))}
                      style={{ width: "100%", padding: "4px 6px", borderRadius: 4, border: "1px solid #1a2a40", background: "#0a0e14", color: "#c0d0e0", fontFamily: "monospace", fontSize: 10 }} />
                  </div>
                </div>
                <div style={{ color: "#334455", fontSize: 8, fontFamily: "monospace", lineHeight: 1.4 }}>
                  {earthquakeAlerts.length > 0 ? `🚨 ALERT: ${earthquakeAlerts.length} cell(s) detected` : earthquakeTriggered ? "✓ Evacuation triggered" : earthquakeStats ? `📊 ${earthquakeStats.totalEvents} events, ${earthquakeStats.activeDevices} device(s)` : "Listening for motion..."}
                </div>
              </div>
            )}
          </div>

          {/* Connectivity */}
          <div style={{ background: "#0d1117", border: "1px solid #1a2a40", borderRadius: 10, padding: 14 }}>
            <div style={{ color: "#8899bb", fontSize: 10, fontFamily: "monospace", letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }}>🔗 Connectivity</div>
            <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
              <button onClick={() => setWifi(true)} style={{ padding: "8px 14px", borderRadius: 7, border: `1px solid ${wifi ? "#00aaff" : "#1a2a40"}`, background: wifi ? "#00aaff15" : "#0a0e14", color: wifi ? "#00aaff" : "#556677", fontFamily: "'JetBrains Mono',monospace", fontSize: 10, cursor: "pointer", fontWeight: wifi ? 600 : 400 }}>📡 WiFi (Global Brain)</button>
              <button onClick={() => setWifi(false)} style={{ padding: "8px 14px", borderRadius: 7, border: `1px solid ${!wifi ? "#ff8800" : "#1a2a40"}`, background: !wifi ? "#ff880015" : "#0a0e14", color: !wifi ? "#ff8800" : "#556677", fontFamily: "'JetBrains Mono',monospace", fontSize: 10, cursor: "pointer", fontWeight: !wifi ? 600 : 400 }}>📶 BT (Local)</button>
            </div>
            <div style={{ color: "#445566", fontSize: 9, fontFamily: "monospace", lineHeight: 1.6 }}>
              {wifi ? "All AI agents share memory. Congestion-aware routing active. Blockades sync globally." : "Offline mode. Local A* pathfinding. Bluetooth peer discovery for nearby blockade sharing."}
            </div>
            <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
              {[
                [brain.count() + 1, "Users", "#00aaff"],
                [blocks.length, "Blocks", blocks.length ? "#ff4444" : "#00ff88"],
                [EXITS.length, "Exits", "#ffaa00"],
              ].map(([v, l, c]) => (
                <div key={l} style={{ background: "#0a0e14", borderRadius: 6, padding: 8, textAlign: "center" }}>
                  <div style={{ color: c, fontSize: 18, fontWeight: 700 }}>{v}</div>
                  <div style={{ color: "#445566", fontSize: 8, fontFamily: "monospace" }}>{l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Blockade Manager */}
        <div style={{ background: "#0d1117", border: `1px solid ${blocks.length > 0 ? "#ff444440" : "#1a2a40"}`, borderRadius: 10, padding: 14, marginTop: 12 }}>
          <div onClick={() => setShowBM(!showBM)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
            <span style={{ color: blocks.length > 0 ? "#ff6666" : "#8899bb", fontSize: 10, fontFamily: "monospace", letterSpacing: 1, textTransform: "uppercase" }}>⛔ Blockade Manager ({blocks.length})</span>
            <span style={{ color: "#445566", fontSize: 10 }}>{showBM ? "▲" : "▼"}</span>
          </div>
          {showBM && <div style={{ marginTop: 10 }}>
            {blocks.length === 0 ? <div style={{ color: "#334455", fontSize: 10, fontFamily: "monospace", fontStyle: "italic", padding: "8px 0" }}>No active blockades.</div> :
              <>{blocks.map((b, i) => <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#0a0e14", borderRadius: 6, padding: "6px 10px", marginBottom: 4, border: "1px solid #ff111118" }}>
                <div><div style={{ color: "#ff6666", fontSize: 10, fontFamily: "monospace", fontWeight: 600 }}>{b.edge}</div><div style={{ color: "#445566", fontSize: 8, fontFamily: "monospace" }}>by {b.by} · {new Date(b.time).toLocaleTimeString()}</div></div>
                <button onClick={() => rmBlock(b.edge)} style={{ padding: "4px 10px", borderRadius: 5, border: "1px solid #00ff8840", background: "#00ff8810", color: "#00ff88", fontSize: 9, fontFamily: "monospace", cursor: "pointer", fontWeight: 600 }}>✓ Clear</button>
              </div>)}
                <button onClick={clearAll} style={{ width: "100%", marginTop: 6, padding: 8, borderRadius: 6, border: "1px solid #00ff8840", background: "#00ff8808", color: "#00ff88", fontSize: 10, fontFamily: "monospace", cursor: "pointer", fontWeight: 600 }}>Clear All & Reroute Everyone</button>
              </>}
          </div>}
        </div>

        {/* AI LOG */}
        <div ref={logRef} style={{ background: "#0a0e14", border: "1px solid #1a2a40", borderRadius: 10, padding: 12, maxHeight: 150, overflowY: "auto", fontFamily: "'JetBrains Mono',monospace", fontSize: 10, marginTop: 12 }}>
          <div style={{ color: "#445566", fontSize: 9, marginBottom: 6, letterSpacing: 1, textTransform: "uppercase" }}>AI Brain Log</div>
          {logs.map((l, i) => (
            <div key={i} style={{ marginBottom: 3, lineHeight: 1.4 }}>
              <span style={{ color: "#222" }}>[{l.time}] </span>
              <span style={{ color: l.type === "error" ? "#ff4444" : l.type === "warn" ? "#ffaa00" : l.type === "success" ? "#00ff88" : l.type === "route" ? "#00aaff" : "#556677" }}>{l.msg}</span>
            </div>
          ))}
          {logs.length === 0 && <div style={{ color: "#334455", fontStyle: "italic" }}>Awaiting...</div>}
        </div>
      </div>
    </div>
  );
}
