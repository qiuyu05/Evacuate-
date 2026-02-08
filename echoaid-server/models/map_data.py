# Map data ported from App.jsx
# Building: UW Mathematics & Computer Building No. 17 — 1st Floor

# Coordinate transformation from GeoJSON to SVG
S = 0.4
OX = 1309
OY = 330.5

def tx(x):
    """Transform GeoJSON X coordinate to SVG space"""
    return (x - OX) * S

def ty(y):
    """Transform GeoJSON Y coordinate to SVG space"""
    return (y - OY) * S

# RAW room and exit data from App.jsx (lines 18-94)
RAW = [
    {"x":2733.5,"y":1386,"id":2,"type":"ROOM","label":"10"},{"x":3644,"y":613,"id":3,"type":"ROOM","label":"083"},
    {"x":2132.5,"y":331,"id":5,"type":"ROOM","label":"101"},
    {"x":1864,"y":836.5,"id":6,"type":"ROOM","label":"104"},{"x":4041,"y":1981,"id":7,"type":"ROOM","label":"1001"},
    {"x":3599.9,"y":2040.9,"id":8,"type":"ROOM","label":"h16","hallway":True,"color":"green"},
    {"x":3771,"y":2438.5,"id":10,"type":"ROOM","label":"1002"},{"x":3544,"y":1849,"id":11,"type":"ROOM","label":"1003"},
    {"x":3535,"y":2137.5,"id":12,"type":"ROOM","label":"1004"},{"x":3445.5,"y":2137.5,"id":13,"type":"ROOM","label":"1005"},
    {"x":3356,"y":2137.5,"id":14,"type":"ROOM","label":"1006"},{"x":3356,"y":1920,"id":15,"type":"ROOM","label":"1007"},
    {"x":3266.5,"y":2137.5,"id":16,"type":"ROOM","label":"1008"},{"x":3266.5,"y":1921,"id":17,"type":"ROOM","label":"1009"},
    {"x":3177,"y":2137.5,"id":18,"type":"ROOM","label":"1010"},{"x":3177,"y":1920,"id":19,"type":"ROOM","label":"1011"},
    {"x":3087.5,"y":2137.5,"id":20,"type":"ROOM","label":"1012"},{"x":3084,"y":1919,"id":21,"type":"ROOM","label":"1013"},
    {"x":2998,"y":2137.5,"id":22,"type":"ROOM","label":"1014"},{"x":2995,"y":1917.5,"id":23,"type":"ROOM","label":"1015"},
    {"x":2908.5,"y":2137.5,"id":24,"type":"ROOM","label":"1016"},{"x":2911,"y":1919,"id":25,"type":"ROOM","label":"1017"},
    {"x":2763,"y":2137.5,"id":26,"type":"ROOM","label":"1018"},{"x":2558,"y":2137.5,"id":27,"type":"ROOM","label":"1020"},
    {"x":2470,"y":2137.5,"id":28,"type":"ROOM","label":"1021"},{"x":2382,"y":2137.5,"id":29,"type":"ROOM","label":"1022"},
    {"x":2294,"y":2137.5,"id":30,"type":"ROOM","label":"1023"},{"x":2206,"y":2137.5,"id":31,"type":"ROOM","label":"1024"},
    {"x":2118,"y":2137.5,"id":32,"type":"ROOM","label":"1025"},{"x":2098,"y":2260,"id":33,"type":"ROOM","label":"1026"},
    {"x":2020.5,"y":2275,"id":34,"type":"ROOM","label":"1026A"},{"x":1873,"y":2108,"id":35,"type":"ROOM","label":"1027"},
    {"x":1868,"y":1911,"id":36,"type":"ROOM","label":"1028"},{"x":1866.5,"y":1819.5,"id":37,"type":"ROOM","label":"1029"},
    {"x":1868,"y":1728.5,"id":38,"type":"ROOM","label":"1030"},{"x":1865,"y":1641,"id":39,"type":"ROOM","label":"1031"},
    {"x":2040.5,"y":1633.5,"id":40,"type":"ROOM","label":"1032"},{"x":1868,"y":1547,"id":41,"type":"ROOM","label":"1033"},
    {"x":1865.5,"y":1455.5,"id":42,"type":"ROOM","label":"1034"},{"x":2041,"y":1522.5,"id":43,"type":"ROOM","label":"1035"},
    {"x":2040,"y":1412,"id":44,"type":"ROOM","label":"1036"},{"x":1870,"y":1366,"id":45,"type":"ROOM","label":"1037"},
    {"x":1864,"y":1272.5,"id":46,"type":"ROOM","label":"1038"},{"x":2039,"y":1301,"id":47,"type":"ROOM","label":"1039"},
    {"x":2041,"y":1187,"id":48,"type":"ROOM","label":"1040"},{"x":1868,"y":1183.5,"id":49,"type":"ROOM","label":"1041"},
    {"x":1871,"y":1091,"id":50,"type":"ROOM","label":"1042"},{"x":1868,"y":998,"id":51,"type":"ROOM","label":"1043"},
    {"x":1865.5,"y":906,"id":52,"type":"ROOM","label":"1044"},{"x":1870.5,"y":843,"id":53,"type":"ROOM","label":"1045"},
    {"x":1876,"y":740.5,"id":54,"type":"ROOM","label":"1046"},{"x":2156,"y":567,"id":55,"type":"ROOM","label":"1048"},
    {"x":2039.5,"y":900,"id":56,"type":"ROOM","label":"1049"},{"x":2302,"y":1254.5,"id":57,"type":"ROOM","label":"1052"},
    {"x":1868,"y":1547,"id":58,"type":"ROOM","label":"1055"},{"x":2303,"y":1774,"id":59,"type":"ROOM","label":"1056"},
    {"x":2038,"y":1829,"id":60,"type":"ROOM","label":"1058"},{"x":2623.5,"y":1699,"id":61,"type":"ROOM","label":"1059"},
    {"x":2943,"y":1634,"id":62,"type":"ROOM","label":"1060A"},{"x":3435.5,"y":1632,"id":63,"type":"ROOM","label":"1060D"},
    {"x":3246,"y":1745.5,"id":64,"type":"ROOM","label":"h14","hallway":True,"color":"green"},{"x":3062.5,"y":1798.5,"id":65,"type":"ROOM","label":"1060H"},
    {"x":3313.5,"y":1799,"id":66,"type":"ROOM","label":"1060G"},{"x":2986,"y":955.5,"id":67,"type":"ROOM","label":"1061A"},
    {"x":3042,"y":1317,"id":68,"type":"ROOM","label":"1061"},{"x":2625,"y":1130,"id":69,"type":"ROOM","label":"1063"},
    {"x":2212,"y":725.5,"id":70,"type":"ROOM","label":"1065"},{"x":2399,"y":727.5,"id":71,"type":"ROOM","label":"1066"},
    {"x":2580,"y":727.5,"id":72,"type":"ROOM","label":"1068"},{"x":2717,"y":727.5,"id":73,"type":"ROOM","label":"1070"},
    {"x":2809,"y":727.5,"id":74,"type":"ROOM","label":"1071"},{"x":2900.5,"y":727.5,"id":75,"type":"ROOM","label":"1072"},
    {"x":2992,"y":727.5,"id":76,"type":"ROOM","label":"1073"},{"x":3083.5,"y":728,"id":77,"type":"ROOM","label":"1074"},
    {"x":3173,"y":727,"id":78,"type":"ROOM","label":"1076"},{"x":3169,"y":945,"id":79,"type":"ROOM","label":"1077"},
    {"x":3427,"y":952,"id":80,"type":"ROOM","label":"1078"},{"x":3263,"y":726,"id":81,"type":"ROOM","label":"1079"},
    {"x":3358,"y":725.5,"id":82,"type":"ROOM","label":"1080"},{"x":3446,"y":725.5,"id":83,"type":"ROOM","label":"1081"},
    {"x":3544,"y":635,"id":84,"type":"ROOM","label":"1082"},{"x":3799,"y":546.5,"id":85,"type":"ROOM","label":"1083B"},
    {"x":3702.5,"y":629.5,"id":86,"type":"ROOM","label":"1083A"},{"x":4076.5,"y":1051,"id":87,"type":"ROOM","label":"1084"},
    {"x":3451,"y":1319.5,"id":88,"type":"ROOM","label":"1085"},{"x":3991,"y":1560.5,"id":89,"type":"ROOM","label":"1088B"},
    {"x":4180,"y":1607,"id":90,"type":"ROOM","label":"1088A"},{"x":3926,"y":1676.5,"id":91,"type":"ROOM","label":"1088"},
    {"x":3974,"y":2200,"id":92,"type":"ROOM","label":"1089"},
    {"x":3594,"y":2310,"id":95,"type":"ROOM","label":"h18","hallway":True,"color":"green"},
    {"x":3552.5,"y":2442,"id":96,"type":"ROOM","label":"1094"},
    {"x":2816,"y":2030,"id":98,"type":"ROOM","label":"h15","hallway":True,"color":"green"},
    {"x":2136.5,"y":1383,"id":100,"type":"ROOM","label":"h19","hallway":True,"color":"green"},{"x":1945,"y":1383,"id":101,"type":"ROOM","label":"h20","hallway":True,"color":"green"},
    {"x":2120,"y":448,"id":103,"type":"ROOM","label":"00"},
    {"x":2107,"y":448,"id":104,"type":"ROOM","label":"1100"},{"x":2125.5,"y":331,"id":105,"type":"ROOM","label":"1101"},
    {"x":2149,"y":330.5,"id":106,"type":"ROOM","label":"1102"},{"x":2824,"y":815.5,"id":107,"type":"ROOM","label":"1103","hallway":True,"color":"green"},
    {"x":3981,"y":1329.6,"id":110,"type":"ROOM","label":"h11","hallway":True,"color":"green"},
    {"x":3710,"y":1325.5,"id":112,"type":"ROOM","label":"h21","hallway":True,"color":"green"},
    {"x":4043,"y":1888,"id":115,"type":"ROOM","label":"1109"},
    {"x":3850,"y":2045.7,"id":118,"type":"ROOM","label":"h17","hallway":True,"color":"green"},
    {"x":3710,"y":841,"id":120,"type":"ROOM","label":"h13","hallway":True,"color":"green"},
    {"x":2151,"y":353.5,"id":123,"type":"ROOM","label":"ELV"},
    {"x":2128.5,"y":354.5,"id":124,"type":"ROOM","label":"ELV"},
    {"x":3720.9,"y":2045.7,"id":126,"type":"ROOM","label":"h1","hallway":True,"color":"green"},
    {"x":3706.3,"y":1760.2,"id":127,"type":"ROOM","label":"h2","hallway":True,"color":"green"},
    {"x":2811.3,"y":1760.2,"id":128,"type":"ROOM","label":"h3","hallway":True,"color":"green"},
    {"x":2148.4,"y":831.3,"id":129,"type":"ROOM","label":"h4","hallway":True,"color":"green"},
    {"x":1940.4,"y":2026.3,"id":130,"type":"ROOM","label":"h5","hallway":True,"color":"green"},
    {"x":2148.4,"y":700.6,"id":131,"type":"ROOM","label":"h6","hallway":True,"color":"green"},
    {"x":1940.4,"y":2026.3,"id":132,"type":"ROOM","label":"h7","hallway":True,"color":"green"},
    {"x":2153.2,"y":2026.3,"id":133,"type":"ROOM","label":"h8","hallway":True,"color":"green"},
    {"x":2032.3,"y":2026.3,"id":134,"type":"ROOM","label":"h9","hallway":True,"color":"green"},
    {"x":1945.2,"y":831.3,"id":135,"type":"ROOM","label":"h10","hallway":True,"color":"green"},
    # Exits
    {"x":2028.4,"y":2141.6,"id":200,"type":"EXIT","label":"Exit 1"},
    {"x":2018,"y":705.5,"id":201,"type":"EXIT","label":"Exit 2"},
    {"x":3753,"y":719.7,"id":202,"type":"EXIT","label":"Exit 3"},
    {"x":3720.9,"y":2150,"id":203,"type":"EXIT","label":"Exit 4"},
]

# Build NODES dictionary with transformed coordinates
NODES = {}
for r in RAW:
    node_id = f"p{r['id']}"
    NODES[node_id] = {
        'id': node_id,
        'x': tx(r['x']),
        'y': ty(r['y']),
        'label': r['label'],
        'type': r['type'],
        'hallway': r.get('hallway', False),
        'color': r.get('color', None)
    }

# Navigation edges from App.jsx (lines 1413-1441)
EDGES = [
    ["p201","p131"], # exit2-h6
    ["p131","p129"], # h6-h4
    ["p129","p135"], # h4-h10
    ["p129","p107"], # h4-h12
    ["p107","p120"], # h12-h13
    ["p107","p128"], # h12-h3
    ["p128","p64"],  # h3-h14
    ["p128","p98"],  # h3-h15
    ["p98","p8"],    # h15-h16
    ["p98","p133"],  # h15-h8
    ["p133","p134"], # h8-h9
    ["p134","p200"], # h9-exit1
    ["p134","p130"], # h9-h5
    ["p130","p101"], # h5-h20
    ["p101","p135"], # h20-h10
    ["p129","p100"], # h4-h19
    ["p100","p133"], # h19-h8
    ["p64","p127"],  # h14-h2
    ["p127","p112"], # h2-h21
    ["p112","p110"], # h21-h11
    ["p112","p120"], # h21-h13
    ["p120","p202"], # h13-exit3
    ["p8","p95"],    # h16-h18
    ["p8","p126"],   # h16-h1
    ["p126","p203"], # h1-exit4
    ["p126","p127"], # h1-h2
    ["p126","p118"], # h1-h17
]

# Exit node IDs
EXITS = ["p200", "p201", "p202", "p203"]

# Hallway nodes (for pathfinding - only hallways and exits are navigable)
HALLWAY_NODES = [node_id for node_id, node in NODES.items()
                 if node.get('hallway') or node['type'] == 'EXIT']
