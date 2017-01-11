# _*_ coding:utf-8 _*_
# Speaker information coming from the transcript
#
# Example:
#   DONALD TRUMP: Thank you very much
#
SPEAKERS = {
    'HILLARY CLINTON': 'speaker dem',
    'TIM KAINE': 'speaker dem',
    'BARAK OBAMA': 'speaker dem',
    'DONALD TRUMP': 'speaker gop',
    'MIKE PENCE': 'speaker gop'
}

# Fact checker information for each annotation
#
# Example:
#   NPR: dm-content-slug TKTKTKTK
#
FACT_CHECKERS = {
    "dm": {
        "initials": "dm",
        "name": "Domenico Montanaro",
        "role": "NPR Political Editor & Digital Audience",
        "page": "http://www.npr.org/people/392602474/domenico-montanaro",
        "img": "http://media.npr.org/assets/img/2015/03/24/domenico_montanaro_npr_007_sq-8689edad716cacac58fb1afc56bc1bcd0d3647e8-s400-c85.jpg"
    },
    "dk": {
        "initials": "dk",
        "name": "Danielle Kurtzleben",
        "role": "NPR Politics Reporter",
        "page": "http://www.npr.org/people/409798174/danielle-kurtzleben",
        "img": "http://media.npr.org/assets/img/2015/09/09/danielle_sq-5e35e46b0d00853b9a1e1208a437e4120140ee87-s400-c85.jpg",
    },
    "sh": {
        "initials": "sh",
        "name": "Scott Horsley",
        "role": "NPR White House Correspondent",
        "page": "http://www.npr.org/people/2788801/scott-horsley",
        "img": "http://media.npr.org/assets/img/2012/01/03/scotthorsley_1_sq-7e17a790277e6cdab2a2ce1efda9ea533612c3c1-s400-c85.jpg",
    },
    "cj2": {
        "initials": "cj2",
        "name": "Carrie Johnson",
        "role": "NPR Justice Correspondent",
        "page": "http://www.npr.org/people/127410674/carrie-johnson",
        "img": "http://media.npr.org/assets/img/2016/08/29/carrie-johnson_sq-eee6c73674b25ec992afb7f965effd6f7833fb43-s400-c85.jpeg",
    },
    "re": {
        "initials": "re",
        "name": "Ron Elving",
        "role": "NPR Senior Editor/Correspondent, Washington Desk",
        "page": "http://www.npr.org/people/1930203/ron-elving",
        "img": "http://media.npr.org/assets/img/2011/12/30/ronelving_6_sq-4fed8d3518bc137960e7293458cd8fe817d733f1-s400-c85.jpg",
    },
    "sm": {
        "initials": "sm",
        "name": "Sarah McCammon",
        "role": "NPR Politics Reporter/Covers Trump",
        "page": "http://www.npr.org/people/448294256/sarah-mccammon",
        "img": "http://media.npr.org/assets/img/2016/08/29/sarah-mccammon_sq-76156874397d280994942908200f3afc71cf2375-s400-c85.jpeg",
    },
    "tk": {
        "initials": "tk",
        "name": "Tamara Keith",
        "role": "NPR White House Correspondent/Covers Clinton",
        "page": "http://www.npr.org/people/122805042/tamara-keith",
        "img": "http://media.npr.org/assets/img/2015/10/14/tkp-1_sq-f03e437803f37ec0f7f205531d4ff5d040413aa3-s400-c85.jpg",
    },
    "jz": {
        "initials": "jz",
        "name": "Jim Zarroli",
        "role": "NPR Business Reporter",
        "page": "http://www.npr.org/people/4581822/jim-zarroli",
        "img": "http://media.npr.org/assets/img/2011/12/30/jimzarroli-29_sq-ddcf14d7b26d69001997527c9c8774c9e35149c3-s400-c85.jpg",
    },
    "mg": {
        "initials": "mg",
        "name": "Marilyn Geewax",
        "role": "NPR Senior Business Editor",
        "page": "http://www.npr.org/people/98525078/marilyn-geewax",
        "img": "http://media.npr.org/assets/img/2012/01/03/marilyngeewax_14_sq-7b41c395ae59d16ae728cb040e56f482645a9b7a-s400-c85.jpg",
    },
    "jb": {
        "initials": "jb",
        "name": "John Burnett",
        "role": "NPR Southwest Correspondent/Covers Immigration",
        "page": "http://www.npr.org/people/1936301/john-burnett",
        "img": "http://media.npr.org/about/people/bios/biophotos/jburnett_2006_sq-0d3aeb9fceb75b82c605be63e71344e6599bc788-s400-c85.jpg",
    },
    "cj": {
        "initials": "cj",
        "name": "Chris Joyce",
        "role": "NPR Science Desk Correspondent/Covers Energy & The Environment",
        "page": "http://www.npr.org/people/2100689/christopher-joyce",
        "img": "http://media.npr.org/assets/img/2011/12/30/chrisjoyce_4_sq-cf6e0bf6978dc2c78bf8c7471b203b6110691789-s400-c85.jpg",
    },
    "eh": {
        "initials": "eh",
        "name": "Elise Hu",
        "role": "NPR International Correspondent",
        "page": "http://www.npr.org/people/144449221/elise-hu",
        "img": "http://media.npr.org/assets/img/2013/05/14/19_sq-c741ae54fa46fff4f34f156426b01e49410db58a-s400-c85.jpg",
    },
    "ew": {
        "initials": "ew",
        "name": "Eric Westervelt",
        "role": "NPR Education Correspondent",
        "page": " http://www.npr.org/people/2101350/eric-westervelt",
        "img": "http://media.npr.org/assets/img/2014/04/15/ericwestervelt_2014_sq-87bc366acd12f35e81f56b1b722428d2cbd4143f-s400-c85.jpg",
    },
    "ak": {
        "initials": "ak",
        "name": "Anya Kamenetz",
        "role": "NPR Education Correspondent",
        "page": "http://www.npr.org/people/302894536/anya-kamenetz",
        "img": "",
    },
    "pe": {
        "initials": "pe",
        "name": "Phil Ewing",
        "role": "NPR National Security Editor",
        "page": "",
        "img": "",
    },
    "tb": {
        "initials": "tb",
        "name": "Tom Bowman",
        "role": "NPR Pentagon Reporter",
        "page": "http://www.npr.org/people/5457129/tom-bowman",
        "img": "http://media.npr.org/assets/img/2012/01/03/tombowman_5_sq-2fb6b9f127b93b56a01bf9ac65e02a316fcffe3e-s400-c85.jpg",
    },
    "mlk": {
        "initials": "mlk",
        "name": "Mary Louise Kelly",
        "role": "NPR National Security Correspondent",
        "page": "http://www.npr.org/people/2780701/mary-louise-kelly",
        "img": "http://media.npr.org/assets/img/2012/01/03/marylouisekelly_22_sq-9f7fa01b1e30ff0431febd9361a039ce40d781fd-s400-c85.jpg",
    },
    "dw": {
        "initials": "dw",
        "name": "David Welna",
        "role": "NPR National Security Correspondent",
        "page": "http://www.npr.org/people/1934700/david-welna",
        "img": "http://media.npr.org/assets/img/2011/12/30/davidwelena_2_sq-0f96da2270f5218920de768d413a892defd4d7a2-s400-c85.jpg",
    },
    "as": {
        "initials": "as",
        "name": "Aarti Shahani",
        "role": "NPR Tech Reporter",
        "page": "http://www.npr.org/people/348730771/aarti-shahani",
        "img": "",
    },
    "ak2": {
        "initials": "ak2",
        "name": "Alison Kodjak",
        "role": "NPR Health Policy Correspondent",
        "page": "http://www.npr.org/people/473143808/alison-kodjak",
        "img": "http://media.npr.org/assets/img/2016/08/29/alison-kodjak_sq-a0eb02146b48f326f827f415d7253f147b1d3933-s400-c85.jpeg",
    },
    "mk2": {
        "initials": "mk2",
        "name": "Michele Kelemen",
        "role": "NPR Diplomacy Correspondent",
        "page": "http://www.npr.org/people/2100727/michele-kelemen",
        "img": "http://media.npr.org/assets/img/2012/01/03/michelekeleman_4_sq-a9bed509fe275b17a898b2b94ebb8472c6fd8736-s400-c85.jpg",
    },
    "jn": {
        "initials": "jn",
        "name": "Joe Neel",
        "role": "NPR Science Desk Editor and Correspondent",
        "page": "http://www.npr.org/people/5005601/joe-neel",
        "img": "http://media.npr.org/assets/img/2014/11/17/neel-joe_02_sq-fe8a9000436295264e28764101509ee94b94b742-s400-c85.jpg",
    },
    "ct": {
        "initials": "ct",
        "name": "Cory Turner",
        "role": "NPR Education Senior Editor",
        "page": "http://www.npr.org/people/349625027/cory-turner",
        "img": "http://media.npr.org/assets/img/2014/11/17/turner-cory_01_sq-56bf9852238070444468e776ec0887db1d19a4d8-s200-c85.jpg",
    },
    "cs": {
        "initials": "cs",
        "name": "Claudio Sanchez",
        "role": "NPR Education Correspondent",
        "page": "http://www.npr.org/people/2101122/claudio-sanchez",
        "img": "http://media.npr.org/assets/img/2011/12/30/claudiosanchez_4_sq-4354e1cf0631e2b24d174d07f30cd93bc7685a59-s200-c85.jpg",
    },
    "rl": {
        "initials": "rl",
        "name": "Russell Lewis",
        "role": "NPR Southern Bureau Chief",
        "page": "http://www.npr.org/people/7569853/russell-lewis",
        "img": "http://media.npr.org/assets/img/2015/10/30/v51a6986-edit-edit_sq.jpg",
    },
    "jb2": {
        "initials": "jb2",
        "name": "Jeff Brady",
        "role": "NPR National Desk Correspondent/Covers Energy",
        "page": "http://www.npr.org/people/4127076/jeff-brady",
        "img": "http://media.npr.org/assets/img/2011/12/29/jeffbrady-18_sq-ad190b9d628d6bca8152d28052736bf789cdf281-s400-c85.jpg",
    },
    "lk": {
        "initials": "lk",
        "name": "Larry Kaplow",
        "role": "NPR Middle East Editor",
        "page": "http://www.npr.org/people/348773786/larry-kaplow",
        "img": "",
    },
    "ss": {
        "initials": "ss",
        "name": "Sam Sanders",
        "role": "NPR Campaign Reporter",
        "page": "http://www.npr.org/people/349243304/sam-sanders",
        "img": "http://media.npr.org/assets/img/2016/02/24/sam-sanders_sq-75ef50e74d772f83531fbdde562e7b8069d024f8-s400-c85.jpg",
    },
    "ep": {
        "initials": "ep",
        "name": "Eyder Peralta",
        "role": "NPR News Desk Correspondent",
        "page": "http://www.npr.org/people/348764934/eyder-peralta",
        "img": "",
    },
    "bn": {
        "initials": "bn",
        "name": "Brian Naylor",
        "role": "NPR Washington Desk Correspondent",
        "page": "http://www.npr.org/people/2100941/brian-naylor",
        "img": "http://media.npr.org/assets/img/2011/12/30/briannaylor_31_sq-9f3097eb696825d889aed003002f81e9bebed40c-s400-c85.jpg",
    },
    "pf": {
        "initials": "pf",
        "name": "Pam Fessler",
        "role": "NPR National Desk Correspondent/Covers Voting",
        "page": "http://www.npr.org/people/2100470/pam-fessler",
        "img": "http://media.npr.org/assets/img/2012/01/03/pamfessier_7_sq-8734f0373778e5331a608257afa3370572680347-s200-c85.jpg",
    },
    "nt": {
        "initials": "nt",
        "name": "Nina Totenberg",
        "role": "NPR Legal Affairs Correspondent",
        "page": "http://www.npr.org/people/2101289/nina-totenberg",
        "img": "http://media.npr.org/assets/img/2016/10/31/20160915_nina_totenberg-30-retouched_sq-b392c67217a68a7c32bb2a3b2a30a2524a713797-s200-c85.jpg"
    },
    "as2": {
        "initials": "as2",
        "name": "Arnie Seipel",
        "role": "NPR Politics Editor",
        "page": "http://www.npr.org/people/348741902/arnie-seipel",
        "img": "http://media.npr.org/assets/img/2016/02/24/arnieseipel_sq-ee8b9faed4ade7e67287c4fcbfb02b56d6cf6d34-s200-c85.jpg"
    },
    "jt": {
        "initials": "jt",
        "name": "Jessica Taylor",
        "role": "NPR Politics Reporter",
        "page": "http://www.npr.org/people/404496424/jessica-taylor",
        "img": "http://media.npr.org/assets/img/2015/05/26/jessica_taylor-10_sq-a663d98b16d1a59dca7e2b903338ba61fa3e195a-s200-c85.jpg"
    },
    "df": {
        "initials": "df",
        "name": "Dana Farrington",
        "role": "NPR Engagement Editor",
        "page": "http://www.npr.org/people/348761550/dana-farrington",
        "img": ""
    },
    "gd": {
        "initials": "gd",
        "name": "Gene Demby",
        "role": "Lead Blogger, Code Switch",
        "page": "http://www.npr.org/people/182264497/gene-demby",
        "img": "http://media.npr.org/assets/img/2013/09/26/o9yuhavxhx7qsro_w8ijrahcosqcvdcnp4taxlwcyze-1-_sq-d59053f6e28c3ca0e2dadb982c58c4587224f817-s200-c85.jpg"
    }
}
