import json
import re
import os

html_path = 'D:/Project/hero-combo-creator2/index.html'
with open(html_path, 'r', encoding='utf-8') as f:
    html = f.read()

# Add data-i18n attributes to index.html
replacements = [
    ('<h2 class=\"dash-login-title\">VTS Admin</h2>', '<h2 class=\"dash-login-title\" data-i18n=\"adminLoginTitle\">VTS Admin</h2>'),
    ('<p class=\"dash-login-sub\">Alliance Structure Attack Analytics</p>', '<p class=\"dash-login-sub\" data-i18n=\"adminLoginSub\">Alliance Structure Attack Analytics</p>'),
    ('placeholder=\"Password\"', 'placeholder=\"Password\" data-i18n-placeholder=\"adminLoginPass\"'),
    ('<button id=\"dashLoginBtn\" class=\"dash-btn dash-btn-primary\">Sign In as Admin</button>', '<button id=\"dashLoginBtn\" class=\"dash-btn dash-btn-primary\" data-i18n=\"adminLoginBtn\">Sign In as Admin</button>'),
    ('<button id=\"dashGuestBtn\" class=\"dash-btn\" style=\"margin-top:0.5rem; background:rgba(255,255,255,0.05); color:var(--text-dim); width:100%; border:1px solid rgba(255,255,255,0.1);\">Enter as Guest</button>', '<button id=\"dashGuestBtn\" class=\"dash-btn\" style=\"margin-top:0.5rem; background:rgba(255,255,255,0.05); color:var(--text-dim); width:100%; border:1px solid rgba(255,255,255,0.1);\" data-i18n=\"adminGuestBtn\">Enter as Guest</button>'),
    ('<h1 class=\"dash-h1\">Structure Attack Analytics</h1>', '<h1 class=\"dash-h1\" data-i18n=\"adminHeaderTitle\">Structure Attack Analytics</h1>'),
    ('<span>Alliance Demolition Tracker</span>', '<span data-i18n=\"adminHeaderSub\">Alliance Demolition Tracker</span>'),
    ('>Live</span>', ' data-i18n=\"adminHeaderLive\">Live</span>'),
    ('<span style=\"font-size: 0.75rem; color: #94a3b8; font-weight: 600;\">Optional: If you want to upload images, insert API Code here:</span>', '<span style=\"font-size: 0.75rem; color: #94a3b8; font-weight: 600;\" data-i18n=\"adminApiPrompt\">Optional: If you want to upload images, insert API Code here:</span>'),
    ('placeholder=\"Paste your API here\"', 'placeholder=\"Paste your API here\" data-i18n-placeholder=\"adminApiPh\"'),
    ('<span>Roster</span>', '<span data-i18n=\"adminBtnRoster\">Roster</span>'),
    ('<span>Upload</span>', '<span data-i18n=\"adminBtnUpload\">Upload</span>'),
    ('<span>Export</span>', '<span data-i18n=\"adminBtnExport\">Export</span>'),
    ('CSV Leaderboard</button>', '<span data-i18n=\"adminExpCsvLead\">CSV Leaderboard</span></button>'),
    ('CSV Attack Details</button>', '<span data-i18n=\"adminExpCsvAtt\">CSV Attack Details</span></button>'),
    ('PDF Report</button>', '<span data-i18n=\"adminExpPdf\">PDF Report</span></button>'),
    ('PNG Dashboard</button>', '<span data-i18n=\"adminExpPng\">PNG Dashboard</span></button>'),
    ('JSON Backup</button>', '<span data-i18n=\"adminExpJson\">JSON Backup</span></button>'),
    ('Import Data</button>', '<span data-i18n=\"adminExpImport\">Import Data</span></button>'),
    ('<span>Refresh</span>', '<span data-i18n=\"adminBtnRefresh\">Refresh</span>'),
    ('<span>Clear All</span>', '<span data-i18n=\"adminBtnClear\">Clear All</span>'),
    ('<p>Drop screenshots here or click to browse</p>', '<p data-i18n=\"adminUploadDrop\">Drop screenshots here or click to browse</p>'),
    ('<span class=\"dash-hint\">PNG, JPG — Multiple structures supported</span>', '<span class=\"dash-hint\" data-i18n=\"adminUploadHint\">PNG, JPG — Multiple structures supported</span>'),
    ('>Uploading...</span>', ' data-i18n=\"adminUploading\">Uploading...</span>'),
    ('<span>Analysis Terminal</span>', '<span data-i18n=\"adminTerminal\">Analysis Terminal</span>'),
    ('<button id=\"dashClearLogBtn\" class=\"dash-btn-xs\" style=\"opacity:0.6\">Clear</button>', '<button id=\"dashClearLogBtn\" class=\"dash-btn-xs\" style=\"opacity:0.6\" data-i18n=\"adminTerminalClear\">Clear</button>'),
    ('<div class=\"dash-kpi-label\">Structure Hits</div>', '<div class=\"dash-kpi-label\" data-i18n=\"adminKpiHits\">Structure Hits</div>'),
    ('<div class=\"dash-kpi-label\">Total Demolition</div>', '<div class=\"dash-kpi-label\" data-i18n=\"adminKpiDemo\">Total Demolition</div>'),
    ('<div class=\"dash-kpi-label\">Active Players</div>', '<div class=\"dash-kpi-label\" data-i18n=\"adminKpiPlayers\">Active Players</div>'),
    ('<div class=\"dash-kpi-label\" id=\"dashKpiMvpLabel\">MVP Contributor</div>', '<div class=\"dash-kpi-label\" id=\"dashKpiMvpLabel\" data-i18n=\"adminKpiMvp\">MVP Contributor</div>'),
    ('<span>Performance Averages</span>', '<span data-i18n=\"adminInsightAvg\">Performance Averages</span>'),
    ('<span>Participation Spread</span>', '<span data-i18n=\"adminInsightPart\">Participation Spread</span>'),
    ('<span>Activity Trend</span>', '<span data-i18n=\"adminInsightTrend\">Activity Trend</span>'),
    ('placeholder=\"Filter by structure, level, day...\"', 'placeholder=\"Filter by structure, level, day...\" data-i18n-placeholder=\"adminHistoryPh\"'),
    ('<option value=\"all\">All Time</option>', '<option value=\"all\" data-i18n=\"adminTimeAll\">All Time</option>'),
    ('<option value=\"weekly\">This Week (Mon-Sun)</option>', '<option value=\"weekly\" data-i18n=\"adminTimeWeek\">This Week (Mon-Sun)</option>'),
    ('<option value=\"daily\">Today (0:00-23:59 GT)</option>', '<option value=\"daily\" data-i18n=\"adminTimeToday\">Today (0:00-23:59 GT)</option>'),
    ('<option value=\"\">All Uploaded Targets</option>', '<option value=\"\" data-i18n=\"adminFilterAll\">All Uploaded Targets</option>'),
    ('placeholder=\"Search member name...\"', 'placeholder=\"Search member name...\" data-i18n-placeholder=\"adminSearchPh\"'),
    ('<th style=\"cursor:default;width:60px\">Rank</th>', '<th style=\"cursor:default;width:60px\" data-i18n=\"adminThRank\">Rank</th>'),
    ('<th data-sort=\"name\" style=\"cursor:pointer\">Member Name</th>', '<th data-sort=\"name\" style=\"cursor:pointer\" data-i18n=\"adminThName\">Member Name</th>'),
    ('<th data-sort=\"total_demolition\" style=\"cursor:pointer;text-align:right\">Total Demo</th>', '<th data-sort=\"total_demolition\" style=\"cursor:pointer;text-align:right\" data-i18n=\"adminThDemo\">Total Demo</th>'),
    ('<th data-sort=\"participation\" style=\"cursor:pointer;text-align:center\">Hits</th>', '<th data-sort=\"participation\" style=\"cursor:pointer;text-align:center\" data-i18n=\"adminThHits\">Hits</th>'),
    ('<th data-sort=\"avg_demolition\" style=\"cursor:pointer;text-align:right\">Avg/Hit</th>', '<th data-sort=\"avg_demolition\" style=\"cursor:pointer;text-align:right\" data-i18n=\"adminThAvg\">Avg/Hit</th>'),
    ('<div class=\"dash-empty\">Loading...</div>', '<div class=\"dash-empty\" data-i18n=\"adminLoading\">Loading...</div>'),
]

html_mod = html
for old, new in replacements:
    if old == 'Confirm & Attach\\n':
        html_mod = html_mod.replace('Confirm & Attach', '<span data-i18n=\"adminApiBtn\">Confirm & Attach</span>')
    else:
        html_mod = html_mod.replace(old, new)

# Handle the specific tricky replacements separately to avoid issues
html_mod = html_mod.replace('Confirm & Attach\n', '<span data-i18n=\"adminApiBtn\">Confirm & Attach</span>\n')
html_mod = html_mod.replace('Top Performers</h2>', '<span data-i18n=\"adminChartTop\">Top Performers</span></h2>')
html_mod = html_mod.replace('Insights</h2>', '<span data-i18n=\"adminChartInsights\">Insights</span></h2>')
html_mod = html_mod.replace('Avg Attendance</div>', '<span data-i18n=\"adminInsightAvgAtt\">Avg Attendance</span></div>')
html_mod = html_mod.replace('Demo / Player</div>', '<span data-i18n=\"adminInsightAvgDemo\">Demo / Player</span></div>')
html_mod = html_mod.replace('Attack History</h2>', '<span data-i18n=\"adminHistoryTitle\">Attack History</span></h2>')
html_mod = html_mod.replace('Leaderboard</h2>', '<span data-i18n=\"adminLeaderboard\">Leaderboard</span></h2>')
html_mod = html_mod.replace('Lowest Performers</h2>', '<span data-i18n=\"adminChartLow\">Lowest Performers</span></h2>')

with open(html_path, 'w', encoding='utf-8') as f:
    f.write(html_mod)

print('Modified HTML')

keys = {
    'adminLoginTitle': 'VTS Admin',
    'adminLoginSub': 'Alliance Structure Attack Analytics',
    'adminLoginPass': 'Password',
    'adminLoginBtn': 'Sign In as Admin',
    'adminGuestBtn': 'Enter as Guest',
    'adminHeaderTitle': 'Structure Attack Analytics',
    'adminHeaderSub': 'Alliance Demolition Tracker',
    'adminHeaderLive': 'Live',
    'adminApiPrompt': 'Optional: If you want to upload images, insert API Code here:',
    'adminApiPh': 'Paste your API here',
    'adminApiBtn': 'Confirm & Attach',
    'adminBtnRoster': 'Roster',
    'adminBtnUpload': 'Upload',
    'adminBtnExport': 'Export',
    'adminExpCsvLead': 'CSV Leaderboard',
    'adminExpCsvAtt': 'CSV Attack Details',
    'adminExpPdf': 'PDF Report',
    'adminExpPng': 'PNG Dashboard',
    'adminExpJson': 'JSON Backup',
    'adminExpImport': 'Import Data',
    'adminBtnRefresh': 'Refresh',
    'adminBtnClear': 'Clear All',
    'adminUploadDrop': 'Drop screenshots here or click to browse',
    'adminUploadHint': 'PNG, JPG — Multiple structures supported',
    'adminUploading': 'Uploading...',
    'adminTerminal': 'Analysis Terminal',
    'adminTerminalClear': 'Clear',
    'adminKpiHits': 'Structure Hits',
    'adminKpiDemo': 'Total Demolition',
    'adminKpiPlayers': 'Active Players',
    'adminKpiMvp': 'MVP Contributor',
    'adminChartTop': 'Top Performers',
    'adminChartInsights': 'Insights',
    'adminInsightAvg': 'Performance Averages',
    'adminInsightAvgAtt': 'Avg Attendance',
    'adminInsightAvgDemo': 'Demo / Player',
    'adminInsightPart': 'Participation Spread',
    'adminInsightTrend': 'Activity Trend',
    'adminHistoryTitle': 'Attack History',
    'adminHistoryPh': 'Filter by structure, level, day...',
    'adminLeaderboard': 'Leaderboard',
    'adminTimeAll': 'All Time',
    'adminTimeWeek': 'This Week (Mon-Sun)',
    'adminTimeToday': 'Today (0:00-23:59 GT)',
    'adminFilterAll': 'All Uploaded Targets',
    'adminSearchPh': 'Search member name...',
    'adminThRank': 'Rank',
    'adminThName': 'Member Name',
    'adminThDemo': 'Total Demo',
    'adminThHits': 'Hits',
    'adminThAvg': 'Avg/Hit',
    'adminChartLow': 'Lowest Performers',
    'adminLoading': 'Loading...'
}

trans_path = 'D:/Project/hero-combo-creator2/js/translations.js'
with open(trans_path, 'r', encoding='utf-8') as f:
    t_js = f.read()

langs = ['en', 'es', 'fr', 'pt', 'de', 'ru', 'tr', 'it', 'ko', 'zh', 'ar', 'id']

for lang in langs:
    inject_str = ''
    for k, v in keys.items():
        v_escaped = v.replace('\"', '\\\"')
        inject_str += f'    {k}: "{v_escaped}",\n'
    
    pattern = r'(' + lang + r'\s*:\s*\{)'
    t_js = re.sub(pattern, r'\g<1>\n' + inject_str, t_js, count=1)

with open(trans_path, 'w', encoding='utf-8') as f:
    f.write(t_js)

print('Modified translations.js')
