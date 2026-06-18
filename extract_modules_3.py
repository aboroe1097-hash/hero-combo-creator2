import re

with open('js/ocr-dashboard.js', 'r', encoding='utf-8') as f:
    ocr_js = f.read()

def extract_functions(content, func_names):
    extracted = []
    lines = content.split('\n')
    new_content = []
    
    in_func = False
    brace_count = 0
    func_lines = []
    
    for line in lines:
        if not in_func:
            # Match function declarations
            match = re.match(r'^(?:async\s+)?(?:export\s+)?function\s+([a-zA-Z0-9_]+)\s*\(', line)
            if match and match.group(1) in func_names:
                in_func = True
                brace_count = line.count('{') - line.count('}')
                func_lines.append(line)
                if brace_count <= 0 and '{' in line:
                    in_func = False
                    extracted.append('\n'.join(func_lines))
                    func_lines = []
            else:
                new_content.append(line)
        else:
            func_lines.append(line)
            brace_count += line.count('{') - line.count('}')
            if brace_count <= 0:
                in_func = False
                extracted.append('\n'.join(func_lines))
                func_lines = []
                
    return '\n'.join(new_content), '\n\n'.join(extracted)

roster_funcs = [
    'loadRoster', 'saveRoster', 'showRosterModal',
    'loadRosterSnapshots', 'saveRosterSnapshots', 'computeRosterDiff', 'takeRosterSnapshot', 'deleteRosterSnapshot',
    'loadAllianceList', 'saveAllianceList', 'loadRosterAuth', 'saveRosterAuth', 'rosterLogin', 'rosterLogout',
    '_ensureMember', 'setRosterStatus', 'setRosterAlliance',
    'toggleBulkCheck', 'toggleBulkSelectAll', 'applyBulkStatus', 'applyBulkAlliance',
    'exportRosterCSV', 'copyRosterNames',
    'showRosterSnapshotModal', 'configureAlliances', 'renderRoster',
    'loadBannerRecords', 'saveBannerRecords', 'showBannerForm', 'deleteBannerRecord', 'renderBanners', 'getTeamColor', 'hashCode'
]

ocr_js, roster_code = extract_functions(ocr_js, roster_funcs)

if roster_code:
    # Need to expose everything to window, or import it back. 
    # Actually, let's just make sure the new variables are moved too, or we can just extract them.
    # We will also need to export these functions so ocr-dashboard.js can use them.
    roster_module = f"""// Extracted Roster System Module

{roster_code}

export {{ 
  loadRoster, saveRoster, showRosterModal,
  loadRosterSnapshots, saveRosterSnapshots, computeRosterDiff, takeRosterSnapshot, deleteRosterSnapshot,
  loadAllianceList, saveAllianceList, loadRosterAuth, saveRosterAuth, rosterLogin, rosterLogout,
  _ensureMember, setRosterStatus, setRosterAlliance,
  toggleBulkCheck, toggleBulkSelectAll, applyBulkStatus, applyBulkAlliance,
  exportRosterCSV, copyRosterNames,
  showRosterSnapshotModal, configureAlliances, renderRoster,
  loadBannerRecords, saveBannerRecords, showBannerForm, deleteBannerRecord, renderBanners, getTeamColor, hashCode
}};
"""
    with open('js/ocr-roster.js', 'w', encoding='utf-8', newline='\n') as f:
        f.write(roster_module)

# Now extract Dashboard Render -> ocr-render.js
render_funcs = ['render', 'showModal', 'closeModal']
ocr_js, render_code = extract_functions(ocr_js, render_funcs)

if render_code:
    render_module = f"""// Extracted OCR Render Module

{render_code}

export {{ render, showModal, closeModal }};
"""
    with open('js/ocr-render.js', 'w', encoding='utf-8', newline='\n') as f:
        f.write(render_module)

# Now extract OCR Engine -> ocr-engine.js
engine_funcs = ['processFiles', 'normalizeStructureName', 'parseOcrResults', 'fmtDate', 'displayGameTime']
ocr_js, engine_code = extract_functions(ocr_js, engine_funcs)

if engine_code:
    engine_module = f"""// Extracted OCR Engine Module

{engine_code}

export {{ processFiles, normalizeStructureName, parseOcrResults, fmtDate, displayGameTime }};
"""
    with open('js/ocr-engine.js', 'w', encoding='utf-8', newline='\n') as f:
        f.write(engine_module)

# Add imports to ocr-dashboard.js
imports = """import { 
  loadRoster, saveRoster, showRosterModal,
  loadRosterSnapshots, saveRosterSnapshots, computeRosterDiff, takeRosterSnapshot, deleteRosterSnapshot,
  loadAllianceList, saveAllianceList, loadRosterAuth, saveRosterAuth, rosterLogin, rosterLogout,
  _ensureMember, setRosterStatus, setRosterAlliance,
  toggleBulkCheck, toggleBulkSelectAll, applyBulkStatus, applyBulkAlliance,
  exportRosterCSV, copyRosterNames,
  showRosterSnapshotModal, configureAlliances, renderRoster,
  loadBannerRecords, saveBannerRecords, showBannerForm, deleteBannerRecord, renderBanners, getTeamColor, hashCode
} from './ocr-roster.js';

import { render, showModal, closeModal } from './ocr-render.js';
import { processFiles, normalizeStructureName, parseOcrResults, fmtDate, displayGameTime } from './ocr-engine.js';
"""
ocr_js = imports + ocr_js

with open('js/ocr-dashboard.js', 'w', encoding='utf-8', newline='\n') as f:
    f.write(ocr_js)

print("OCR Dashboard modules extracted successfully.")
