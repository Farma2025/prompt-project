import React, { useState, useEffect, useRef } from 'react';
import {
  FileCode, Copy, Check, ExternalLink, BookOpen, Download, Sparkles,
  BarChart3, AlertCircle, Zap, History, Star
} from 'lucide-react';

/**
 * App.js
 * Upgraded single-file React component for:
 * "Legacy Code Documentation Generator"
 *
 * - No external packages required
 * - Adds: Quality scoring, Issues finder, Drag & drop file upload,
 *   Persistent history (localStorage), Shareable session (Base64),
 *   Print / Save as PDF via browser print, Syntax "highlight" preview (pure JS),
 *   Light/Dark mode toggle, and UI improvements — all while preserving original style.
 *
 * Paste this file in place of your current App.js.
 */

function App() {
  // -----------------------
  // Core state (original)
  // -----------------------
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('java');
  const [docStyle, setDocStyle] = useState('comprehensive');
  const [audience, setAudience] = useState('general');
  const [prompt, setPrompt] = useState('');
  const [copied, setCopied] = useState(false);
  const [documentation, setDocumentation] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [codeStats, setCodeStats] = useState({ lines: 0, functions: 0, complexity: 'Low' });
  const [showStats, setShowStats] = useState(false);
  const [documentedCount, setDocumentedCount] = useState(0);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  // -----------------------
  // New state (no libs)
  // -----------------------
  const [qualityReport, setQualityReport] = useState(null);
  const [issues, setIssues] = useState([]);
  const [theme, setTheme] = useState('dark'); // dark | light
  const [dragOver, setDragOver] = useState(false);
  const [shareUrl, setShareUrl] = useState('');

  const fileInputRef = useRef(null);
  const previewRef = useRef(null);

  // -----------------------
  // Example code map (unchanged)
  // -----------------------
  const exampleCode = {
    java: `public class DataProcessor {
    private Map<String, Object> cache;
    
    public Object processData(String key, byte[] data) throws Exception {
        if (cache.containsKey(key)) {
            return cache.get(key);
        }
        Object result = transform(data);
        cache.put(key, result);
        return result;
    }
    
    private Object transform(byte[] data) {
        return new String(data);
    }
}`,
    python: `def process_records(records, threshold=100):
    results = []
    for r in records:
        val = r.get('value', 0)
        if val > threshold:
            results.append({'id': r['id'], 'processed': val * 1.5})
    return results

def calculate_metrics(data):
    total = sum(data)
    avg = total / len(data) if data else 0
    return {'total': total, 'average': avg}`,
    javascript: `function processData(items) {
    const cache = new Map();
    return items.map(item => {
        if (cache.has(item.id)) {
            return cache.get(item.id);
        }
        const result = transform(item);
        cache.set(item.id, result);
        return result;
    });
}

async function fetchAndProcess(url) {
    const response = await fetch(url);
    const data = await response.json();
    return processData(data);
}`,
    cpp: `#include <iostream>
#include <map>
#include <string>

class DataProcessor {
private:
    std::map<std::string, int> cache;
    
public:
    int processData(std::string key, int* data, int size) {
        if (cache.find(key) != cache.end()) {
            return cache[key];
        }
        int result = transform(data, size);
        cache[key] = result;
        return result;
    }
    
    int transform(int* data, int size) {
        int sum = 0;
        for (int i = 0; i < size; i++) {
            sum += data[i];
        }
        return sum;
    }
};`,
    php: `<?php
class DataProcessor {
    private $cache = [];
    
    public function processData($key, $data) {
        if (isset($this->cache[$key])) {
            return $this->cache[$key];
        }
        $result = $this->transform($data);
        $this->cache[$key] = $result;
        return $result;
    }
    
    private function transform($data) {
        return array_map(function($item) {
            return $item * 2;
        }, $data);
    }
}
?>`,
    csharp: `using System;
using System.Collections.Generic;

public class DataProcessor {
    private Dictionary<string, object> cache;
    
    public object ProcessData(string key, byte[] data) {
        if (cache.ContainsKey(key)) {
            return cache[key];
        }
        var result = Transform(data);
        cache[key] = result;
        return result;
    }
    
    private object Transform(byte[] data) {
        return System.Text.Encoding.UTF8.GetString(data);
    }
}`
  };

  // -----------------------
  // Persistence: load history + share payload from URL on mount
  // -----------------------
  useEffect(() => {
    try {
      const raw = localStorage.getItem('lcdg_history_v2');
      if (raw) setHistory(JSON.parse(raw));
    } catch (e) {
      console.warn('Failed to load history', e);
    }

    // load share link if url contains hash
    try {
      if (window.location.hash && window.location.hash.length > 1) {
        const payload = window.location.hash.slice(1);
        const json = JSON.parse(atob(payload));
        if (json && json.code) {
          setCode(json.code || '');
          if (json.language) setLanguage(json.language);
          if (json.docStyle) setDocStyle(json.docStyle);
          if (json.audience) setAudience(json.audience);
        }
      }
    } catch (e) {
      // ignore invalid share strings
    }
  }, []);

  // persist history whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('lcdg_history_v2', JSON.stringify(history));
    } catch (e) {
      console.warn('Failed to save history', e);
    }
  }, [history]);

  // -----------------------
  // Real-time analysis: lines, functions, complexity, plus issues & quality
  // -----------------------
  useEffect(() => {
    if (code.trim()) {
      const lines = code.split('\n').length;
      const functionMatches = code.match(/function|def |public |private |protected |class /g);
      const functions = functionMatches ? functionMatches.length : 0;

      let complexity = 'Low';
      if (lines > 50 || functions > 5) complexity = 'Medium';
      if (lines > 100 || functions > 10) complexity = 'High';

      setCodeStats({ lines, functions, complexity });
      setShowStats(true);

      const found = analyzeIssues(code);
      setIssues(found);

      const quality = calculateQualityScore(code, found, documentation, complexity);
      setQualityReport(quality);
    } else {
      setShowStats(false);
      setIssues([]);
      setQualityReport(null);
      setCodeStats({ lines: 0, functions: 0, complexity: 'Low' });
    }
  }, [code, documentation]);

  // -----------------------
  // Language auto-detect (improved)
  // -----------------------
  const detectLanguage = (codeText) => {
    if (!codeText) return language;
    const lower = codeText.toLowerCase();
    if (/\bdef\b|\bimport\b/.test(lower)) return 'python';
    if (/\bfunction\b|\bconst\b|\blet\b/.test(lower)) return 'javascript';
    if (/\bpublic class\b|\bprivate\b|\bthrows\b/.test(lower)) return 'java';
    if (/\busing\b|\bnamespace\b|\bconsole\.writeline\b/.test(lower)) return 'csharp';
    if (/#include|std::/.test(lower)) return 'cpp';
    if (/<\?php|\becho\b/.test(lower)) return 'php';
    return language;
  };

  // -----------------------
  // Analyze issues (heuristic)
  // -----------------------
  const analyzeIssues = (text) => {
    if (!text) return [];
    const issuesFound = [];

    // TODO/FIXME/XXX
    const todoMatches = text.match(/TODO|FIXME|XXX/gi);
    if (todoMatches) issuesFound.push({ type: 'TODOs', detail: `${todoMatches.length} TODO/FIXME/XXX markers` });

    // Comments count heuristic
    const commentCount = (text.match(/\/\*|\*\/|\/\/|# /g) || []).length;
    const lineCount = text.split('\n').length;
    if (commentCount < Math.max(1, Math.floor(lineCount / 10))) {
      issuesFound.push({ type: 'Missing Comments', detail: `${commentCount} comments for ${lineCount} lines` });
    }

    // Magic numbers (simple heuristic)
    const magicMatches = text.match(/[^A-Za-z0-9_](?:[2-9][0-9]?|[1-9][0-9]{2,})[^A-Za-z0-9_]/g);
    if (magicMatches && magicMatches.length > 0) {
      issuesFound.push({ type: 'Magic Numbers', detail: `${magicMatches.length} suspicious numeric literals` });
    }

    // Deprecated C++ patterns or other old APIs (simple)
    if (/auto_ptr|register|gets\s*\(/i.test(text)) {
      issuesFound.push({ type: 'Deprecated patterns', detail: 'Use of deprecated/unsafe APIs detected' });
    }

    // Null-check heuristics
    const hasNull = /null|NULL|None/.test(text);
    const hasNullChecks = /==\s*null|!=\s*null|is not None|is None/.test(text);
    if (hasNull && !hasNullChecks) {
      issuesFound.push({ type: 'Null checks', detail: 'Possible missing null checks' });
    }

    // Deep nesting heuristic
    const linesArr = text.split('\n');
    let depth = 0;
    let maxDepth = 0;
    linesArr.forEach(l => {
      if (/\b(for|while|if|switch)\b/.test(l)) depth++;
      if (/\}/.test(l) || /\bend\b/.test(l)) depth = Math.max(0, depth - 1);
      if (depth > maxDepth) maxDepth = depth;
    });
    if (maxDepth >= 4) {
      issuesFound.push({ type: 'Deep nesting', detail: `Max nesting depth ~${maxDepth}` });
    }

    // Long functions heuristic: look for long blocks between braces or dedentation in python
    const functionBlocks = text.split(/\bfunction\b|\bdef\b|\bpublic\b|\bprivate\b/).filter(s => s.length > 500);
    if (functionBlocks.length > 0) {
      issuesFound.push({ type: 'Long functions', detail: `${functionBlocks.length} very long function(s) detected` });
    }

    return issuesFound;
  };

  // -----------------------
  // Quality score (simple explainable heuristics)
  // -----------------------
  const calculateQualityScore = (codeText, foundIssues = [], docText = '', complexity = 'Low') => {
    const lines = codeText ? codeText.split('\n').length : 0;
    const commentCount = (codeText.match(/\/\*|\*\/|\/\/|# /g) || []).length;

    // commentScore: proportion of comments -> scaled
    const commentScore = Math.min(100, Math.round((commentCount / Math.max(1, lines)) * 100 * 1.2));

    // complexityScore: penalize by declared complexity and longest nesting
    let complexityPenalty = complexity === 'High' ? 30 : (complexity === 'Medium' ? 15 : 5);
    const nestingPenalty = Math.min(40, foundIssues.filter(i => i.type === 'Deep nesting').length * 10);
    const longFuncPenalty = Math.min(30, foundIssues.filter(i => i.type === 'Long functions').length * 10);

    const complexityScore = Math.max(10, 100 - complexityPenalty - nestingPenalty - longFuncPenalty);

    // clarity: penalize magic numbers and missing comments
    const magicPenalty = Math.min(40, foundIssues.filter(i => i.type === 'Magic Numbers').length * 8);
    const missingComments = foundIssues.some(i => i.type === 'Missing Comments') ? 25 : 0;
    const clarityScore = Math.max(10, 100 - magicPenalty - missingComments);

    // final maintainability: average
    const maintainability = Math.round((commentScore + complexityScore + clarityScore) / 3);

    // doc completeness: presence of documentation text + comment density
    const docPresence = docText.trim() ? 30 : 0;
    const docCompleteness = Math.min(100, Math.round((commentCount * 5) + docPresence));

    // risk: number of issues weighted + complexity
    const issueCount = foundIssues.length;
    const risk = Math.min(100, Math.round(issueCount * 15 + complexityPenalty));

    return {
      maintainability,
      commentScore,
      complexityScore,
      clarityScore,
      docCompleteness,
      risk
    };
  };

  // -----------------------
  // Syntax highlight preview (very lightweight, pure JS)
  // - Wraps common keywords and comments in spans and returns HTML string
  // - It's a preview only; editing remains in textarea
  // -----------------------
  const highlightCode = (text, lang) => {
    if (!text) return '<pre style="margin:0;padding:12px;font-family:ui-monospace, SFMono-Regular, Menlo, Monaco, monospace;">// Preview will appear here</pre>';

    // Escape HTML
    const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    let html = esc(text);

    // Common patterns
    // comments
    html = html.replace(/(\/\*[\s\S]*?\*\/|\/\/.*$|#.*$)/gm, (m) => `<span class="text-slate-400">${esc(m)}</span>`);

    // strings
    html = html.replace(/("[^"]*"|'[^']*'|`[^`]*`)/g, (m) => `<span class="text-green-300">${esc(m)}</span>`);

    // numbers
    html = html.replace(/\b([0-9]+(?:\.[0-9]+)?)\b/g, (m) => `<span class="text-yellow-300">${m}</span>`);

    // keywords per language
    const keywords = {
      common: ['return', 'const', 'let', 'var', 'if', 'else', 'for', 'while', 'switch', 'case', 'break', 'continue', 'class', 'new', 'throw', 'try', 'catch', 'finally', 'import', 'from', 'export'],
      java: ['public', 'private', 'protected', 'void', 'throws', 'implements', 'extends'],
      python: ['def', 'None', 'True', 'False', 'self', 'elif', 'lambda', 'with', 'as'],
      javascript: ['async', 'await', '=>', 'function'],
      cpp: ['#include', 'std::', 'template', 'typename', 'constexpr'],
      php: ['<?php', 'echo', '$this'],
      csharp: ['using', 'namespace', 'Console', 'static']
    };

    const allKeywords = new Set([...keywords.common, ...(keywords[lang] || [])]);
    // Replace keywords (word boundaries)
    allKeywords.forEach(k => {
      const safe = k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp('\\b' + safe + '\\b', 'g');
      html = html.replace(re, `<span class="text-purple-300 font-semibold">${k}</span>`);
    });

    // Line breaks to <br/> (preserve formatting)
    html = `<pre style="margin:0;padding:12px;font-family:ui-monospace, SFMono-Regular, Menlo, Monaco, monospace;"><code>${html}</code></pre>`;
    return html;
  };

  // -----------------------
  // Generate Prompt (original logic, kept)
  // -----------------------
  const generatePrompt = () => {
    if (!code.trim()) {
      alert('Please enter some code to document');
      return;
    }

    setIsGenerating(true);

    const styleDescriptions = {
      comprehensive: 'detailed API reference with full explanations',
      concise: 'brief technical summaries',
      tutorial: 'educational style with examples',
      migration: 'refactoring focused with modernization suggestions'
    };

    setTimeout(() => {
      const generatedPrompt = `You are a technical documentation expert. Analyze and document the following ${language} code.

CODE:
\`\`\`${language}
${code}
\`\`\`

Documentation style: ${styleDescriptions[docStyle]}
Target audience: ${audience}

Please provide:
1. **Overview** - What this code does and its purpose
2. **Key Components** - Main classes, functions, and their responsibilities
3. **Parameters & Returns** - All inputs and outputs with types
4. **Usage Examples** - How to use this code correctly
5. **Critical Issues & Fixes** - Identify ALL problems including:
   - Uninitialized variables (null references, missing constructors)
   - Thread safety issues (race conditions, concurrent access)
   - Exception handling problems (overly broad catches, missing checks)
   - Null pointer risks (missing null checks on inputs/outputs)
   - Type safety issues (unsafe casts, generic type problems)
   - Security vulnerabilities
   - Performance bottlenecks
   
   For each issue, provide specific fixes with corrected code examples.

Additionally, summarize the top 5 most important issues found: ${issues.map(i => i.type).join(', ') || 'None'}.

Be concise and actionable.`;

      setPrompt(generatedPrompt);
      setIsGenerating(false);
      setDocumentation('');

      // Add to history (persistent)
      const historyItem = {
        id: Date.now(),
        language,
        preview: code.substring(0, 80) + (code.length > 80 ? '...' : ''),
        timestamp: new Date().toLocaleString(),
        style: docStyle,
        code,
        audience
      };
      setHistory(prev => [historyItem, ...prev].slice(0, 100));
    }, 700);
  };

  // -----------------------
  // Copy prompt to clipboard
  // -----------------------
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      alert('Failed to copy. Please copy manually.');
    }
  };

  // -----------------------
  // Download prompt as txt (original)
  // -----------------------
  const downloadPrompt = () => {
    if (!prompt.trim()) {
      alert('Please generate a prompt first');
      return;
    }

    const content = `# Legacy Code Documentation Prompt
Generated on: ${new Date().toLocaleString()}
Language: ${language}
Style: ${docStyle}
Audience: ${audience}

---

${prompt}

---

Generated by Legacy Code Documentation Generator
`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prompt-${language}-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // -----------------------
  // Print / Save as PDF via browser (open printable page then call print)
  // -----------------------
  const printPrompt = () => {
    if (!prompt.trim()) {
      alert('Please generate a prompt first');
      return;
    }
    const popup = window.open('', '_blank');
    if (!popup) {
      alert('Popup blocked — allow popups for this site to print/save as PDF.');
      return;
    }
    const html = `
      <html>
        <head>
          <title>Prompt - Legacy Code Documentation Generator</title>
          <style>
            body { font-family: Arial, Helvetica, sans-serif; padding: 20px; color: #0f1724; }
            pre { white-space: pre-wrap; word-wrap: break-word; background:#f6f7fb;padding:12px;border-radius:6px;border:1px solid #e5e7eb; }
            h1 { font-size:18px; }
          </style>
        </head>
        <body>
          <h1>Legacy Code Documentation Prompt</h1>
          <div>Generated on: ${new Date().toLocaleString()}</div>
          <div>Language: ${language} • Style: ${docStyle} • Audience: ${audience}</div>
          <hr/>
          <pre>${escapeHtml(prompt)}</pre>
          <script>window.onload = () => { window.print(); };</script>
        </body>
      </html>
    `;
    popup.document.write(html);
    popup.document.close();
  };

  // -----------------------
  // Download documentation as MD (original)
  // -----------------------
  const downloadDocumentation = () => {
    if (!documentation.trim()) {
      alert('Please paste documentation first before downloading');
      return;
    }

    setDocumentedCount(prev => prev + 1);

    const content = `# Legacy Code Documentation
Generated on: ${new Date().toLocaleString()}
Language: ${language}
Style: ${docStyle}
Audience: ${audience}

---

## Original Code

\`\`\`${language}
${code}
\`\`\`

---

## Documentation

${documentation}

---

Generated by Legacy Code Documentation Generator
`;

    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `documentation-${language}-${Date.now()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Print documentation (browser)
  const printDocumentation = () => {
    if (!documentation.trim()) {
      alert('Please paste documentation first before printing');
      return;
    }
    const popup = window.open('', '_blank');
    if (!popup) {
      alert('Popup blocked — allow popups for this site to print/save as PDF.');
      return;
    }
    const html = `
      <html>
        <head>
          <title>Documentation - Legacy Code Documentation Generator</title>
          <style>
            body { font-family: Arial, Helvetica, sans-serif; padding: 20px; color: #0f1724; }
            pre { white-space: pre-wrap; word-wrap: break-word; background:#f6f7fb;padding:12px;border-radius:6px;border:1px solid #e5e7eb; }
            h1 { font-size:18px; }
          </style>
        </head>
        <body>
          <h1>Legacy Code Documentation</h1>
          <div>Generated on: ${new Date().toLocaleString()}</div>
          <div>Language: ${language} • Style: ${docStyle} • Audience: ${audience}</div>
          <hr/>
          <h3>Original Code</h3>
          <pre>${escapeHtml(code)}</pre>
          <h3>Documentation</h3>
          <pre>${escapeHtml(documentation)}</pre>
          <script>window.onload = () => { window.print(); };</script>
        </body>
      </html>
    `;
    popup.document.write(html);
    popup.document.close();
  };

  // -----------------------
  // Helpers: escape HTML
  // -----------------------
  function escapeHtml(s) {
    if (!s) return '';
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // -----------------------
  // Paste handler (auto-detect language)
  // -----------------------
  const handlePaste = (e) => {
    const pastedText = e.clipboardData.getData('text');
    const detectedLang = detectLanguage(pastedText);
    if (detectedLang !== language) {
      setLanguage(detectedLang);
    }
    setCode(pastedText);
  };

  // -----------------------
  // Drag & drop file handling (pure JS)
  // -----------------------
  const handleFile = (file) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target.result;
      setCode(text);
      const detected = detectLanguage(text);
      setLanguage(detected);
    };
    reader.readAsText(file);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const onDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const onDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  // -----------------------
  // History actions (localStorage persisted)
  // -----------------------
  const loadHistoryItem = (item) => {
    if (!item) return;
    setCode(item.code || '');
    setLanguage(item.language || 'java');
    setDocStyle(item.style || 'comprehensive');
    setAudience(item.audience || 'general');
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('lcdg_history_v2');
  };

  // -----------------------
  // Shareable link (Base64 in hash)
  // -----------------------
  const generateShareLink = () => {
    const payload = { code, language, docStyle, audience };
    try {
      const encoded = btoa(JSON.stringify(payload));
      const url = `${window.location.origin}${window.location.pathname}#${encoded}`;
      setShareUrl(url);
      navigator.clipboard.writeText(url).catch(()=>{});
      alert('Shareable link copied to clipboard');
    } catch (e) {
      alert('Failed to generate share link');
    }
  };

  // -----------------------
  // Load example code
  // -----------------------
  const loadExample = () => {
    const exampleCodeText = exampleCode[language] || exampleCode.java;
    setCode(exampleCodeText);
    setIsGenerating(true);
    setTimeout(() => setIsGenerating(false), 400);
  };

  // -----------------------
  // Open Claude (unchanged)
  // -----------------------
  const openClaude = () => {
    window.open('https://claude.ai/new', '_blank');
  };

  // -----------------------
  // Theme toggle
  // -----------------------
  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  // small theme helpers (Tailwind class strings)
  const themeBg = theme === 'dark'
    ? 'min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6'
    : 'min-h-screen bg-gradient-to-br from-gray-100 via-indigo-100 to-white p-6';

  const panelBg = theme === 'dark'
    ? 'bg-slate-800/90 backdrop-blur rounded-lg shadow-xl p-6 border border-slate-700'
    : 'bg-white/90 backdrop-blur rounded-lg shadow-xl p-6 border border-gray-200';

  // -----------------------
  // Syntax preview HTML (recomputed)
  // -----------------------
  const previewHtml = highlightCode(code, language);

  // -----------------------
  // Render UI (keeps original layout & style)
  // -----------------------
  return (
    <div className={themeBg}>
      <div className="max-w-7xl mx-auto">
        {/* Header with Stats */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-3">
            <FileCode className="w-10 h-10 text-blue-400 animate-pulse" />
            <h1 className={`text-4xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Legacy Code Documentation Generator</h1>
            <Sparkles className="w-8 h-8 text-yellow-400 animate-pulse" />
          </div>
          <p className={`${theme === 'dark' ? 'text-slate-300' : 'text-gray-600'} text-lg mb-4`}>Transform undocumented legacy code into clear documentation</p>

          {/* Achievement Badge */}
          {documentedCount > 0 && (
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-yellow-600 to-orange-600 text-white px-4 py-2 rounded-full text-sm font-semibold animate-bounce">
              <Star className="w-4 h-4" />
              {documentedCount} Code{documentedCount > 1 ? 's' : ''} Documented!
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 mb-4">
          <button onClick={toggleTheme} className="px-3 py-1 rounded-lg bg-slate-700 text-white text-sm">
            {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          </button>
          <button onClick={() => fileInputRef.current.click()} className="px-3 py-1 rounded-lg bg-slate-700 text-white text-sm">Upload File</button>
          <input ref={fileInputRef} type="file" accept=".java,.py,.js,.cpp,.c,.cs,.php" onChange={(e) => { if (e.target.files[0]) handleFile(e.target.files[0]); }} style={{ display: 'none' }} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input Section */}
          <div className={`${panelBg} transition-all hover:shadow-2xl hover:border-blue-500/50`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className={`text-2xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} flex items-center gap-2`}>
                <FileCode className="w-6 h-6 text-blue-400" />
                Code Input
              </h2>
              <div className="flex items-center gap-2">
                <div className="text-xs text-slate-400 mr-2">Maintainability</div>
                <div className="px-3 py-1 bg-slate-700/60 text-white rounded text-sm">{qualityReport ? `${qualityReport.maintainability}%` : '—'}</div>
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-3 py-1 rounded-lg text-sm transition-colors"
                >
                  <History className="w-4 h-4" />
                  History
                </button>
              </div>
            </div>

            {/* History Dropdown */}
            {showHistory && history.length > 0 && (
              <div className="mb-4 bg-slate-900 border border-slate-700 rounded-lg p-3 max-h-40 overflow-y-auto">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-slate-300">Recent Sessions</h3>
                  <button onClick={clearHistory} className="text-xs text-red-300">Clear</button>
                </div>
                {history.map(item => (
                  <div key={item.id} className="text-xs text-slate-400 py-1 border-b border-slate-700 last:border-0 cursor-pointer" onClick={() => loadHistoryItem(item)}>
                    <div className="flex justify-between">
                      <span className="text-blue-400">{item.language}</span>
                      <span className="text-slate-500">{item.timestamp}</span>
                    </div>
                    <div className="text-slate-500 truncate">{item.preview}</div>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="group">
                  <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                    Language
                    <span className="text-xs text-slate-500">(auto-detected)</span>
                  </label>
                  <select 
                    value={language} 
                    onChange={(e) => setLanguage(e.target.value)} 
                    className="w-full bg-slate-700 text-white rounded-lg px-4 py-2 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all hover:border-blue-400"
                  >
                    <option value="java">Java</option>
                    <option value="python">Python</option>
                    <option value="javascript">JavaScript</option>
                    <option value="csharp">C#</option>
                    <option value="cpp">C++</option>
                    <option value="php">PHP</option>
                  </select>
                </div>
                <div className="group">
                  <label className="block text-sm font-medium text-slate-300 mb-2">Doc Style</label>
                  <select 
                    value={docStyle} 
                    onChange={(e) => setDocStyle(e.target.value)} 
                    className="w-full bg-slate-700 text-white rounded-lg px-4 py-2 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all hover:border-blue-400"
                  >
                    <option value="comprehensive">📚 Comprehensive</option>
                    <option value="concise">⚡ Concise</option>
                    <option value="tutorial">🎓 Tutorial</option>
                    <option value="migration">🔄 Migration</option>
                  </select>
                </div>
              </div>

              <div className="group">
                <label className="block text-sm font-medium text-slate-300 mb-2">Target Audience</label>
                <select 
                  value={audience} 
                  onChange={(e) => setAudience(e.target.value)} 
                  className="w-full bg-slate-700 text-white rounded-lg px-4 py-2 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all hover:border-blue-400"
                >
                  <option value="general">👥 General Developers</option>
                  <option value="junior">🌱 Junior Developers</option>
                  <option value="expert">🎯 Expert Developers</option>
                  <option value="non-technical">💼 Non-Technical Stakeholders</option>
                </select>
              </div>

              {/* Live Stats + Quality */}
              {showStats && (
                <div className="bg-gradient-to-r from-blue-900/40 to-purple-900/40 border border-blue-700/50 rounded-lg p-3 animate-fadeIn">
                  <div className="flex items-center gap-2 mb-2">
                    <BarChart3 className="w-4 h-4 text-blue-400" />
                    <h3 className="text-sm font-semibold text-blue-300">Live Code Analysis</h3>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-xs mb-3">
                    <div className="bg-slate-800/50 rounded p-2 text-center">
                      <div className="text-slate-400">Lines</div>
                      <div className="text-white font-bold text-lg">{codeStats.lines}</div>
                    </div>
                    <div className="bg-slate-800/50 rounded p-2 text-center">
                      <div className="text-slate-400">Functions</div>
                      <div className="text-white font-bold text-lg">{codeStats.functions}</div>
                    </div>
                    <div className="bg-slate-800/50 rounded p-2 text-center">
                      <div className="text-slate-400">Complexity</div>
                      <div className={`font-bold text-lg ${
                        codeStats.complexity === 'Low' ? 'text-green-400' :
                        codeStats.complexity === 'Medium' ? 'text-yellow-400' : 'text-red-400'
                      }`}>{codeStats.complexity}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div className="bg-slate-800/40 rounded p-2 text-center">
                      <div className="text-slate-400">Maintainability</div>
                      <div className="text-white font-bold text-lg">{qualityReport ? `${qualityReport.maintainability}%` : '—'}</div>
                    </div>
                    <div className="bg-slate-800/40 rounded p-2 text-center">
                      <div className="text-slate-400">Doc Completeness</div>
                      <div className="text-white font-bold text-lg">{qualityReport ? `${qualityReport.docCompleteness}%` : '—'}</div>
                    </div>
                    <div className="bg-slate-800/40 rounded p-2 text-center">
                      <div className="text-slate-400">Risk</div>
                      <div className="text-white font-bold text-lg">{qualityReport ? `${qualityReport.risk}%` : '—'}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Code input area with drag & drop */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                  Legacy Code
                  {code.trim() && (
                    <span className="text-xs text-green-400 flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      Ready
                    </span>
                  )}
                </label>
                <div
                  onDrop={onDrop}
                  onDragOver={onDragOver}
                  onDragLeave={onDragLeave}
                  className={`relative ${dragOver ? 'ring-2 ring-blue-500' : ''}`}
                >
                  <textarea
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    onPaste={handlePaste}
                    placeholder="Paste your legacy code here... (Language will be auto-detected) — or drop a file"
                    className="w-full h-40 bg-slate-700 text-white rounded-lg px-4 py-3 font-mono text-sm border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none transition-all hover:border-blue-400"
                  />
                  {!code.trim() && (
                    <div className="absolute top-12 left-1/2 transform -translate-x-1/2 text-slate-500 text-center pointer-events-none">
                      <FileCode className="w-12 h-12 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">Drop your code here</p>
                    </div>
                  )}
                </div>

                {/* Pure-JS syntax highlighted preview (non-destructive) */}
                <div className="mt-3">
                  <div className="text-xs text-slate-400 mb-1">Preview</div>
                  <div className="rounded-lg overflow-auto border border-slate-700 bg-slate-900">
                    <div
                      ref={previewRef}
                      className="prose-sm p-2"
                      style={{ minHeight: 120 }}
                      dangerouslySetInnerHTML={{ __html: previewHtml }}
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={loadExample} 
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 px-6 rounded-lg transition-all transform hover:scale-105 active:scale-95"
                >
                  Load Example
                </button>
                <button 
                  onClick={generatePrompt} 
                  disabled={!code.trim() || isGenerating}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-slate-700 disabled:to-slate-700 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-all flex items-center justify-center gap-2 transform hover:scale-105 active:scale-95"
                >
                  {isGenerating ? (
                    <>
                      <Sparkles className="w-5 h-5 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Zap className="w-5 h-5" />
                      Generate Prompt
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Output Section */}
          <div className={`${panelBg} transition-all hover:shadow-2xl hover:border-purple-500/50`}>
            <h2 className={`text-2xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-4 flex items-center gap-2`}>
              <Sparkles className="w-6 h-6 text-purple-400" />
              Generated Prompt
            </h2>

            {!prompt ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-center py-20">
                <div className="animate-fadeIn">
                  <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-50 animate-pulse" />
                  <p className="text-lg font-semibold">Your generated prompt will appear here</p>
                  <p className="text-sm mt-2">Fill in the code and click "Generate Prompt"</p>
                  <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-500">
                    <AlertCircle className="w-4 h-4" />
                    <span>Pro tip: Paste code and we'll auto-detect the language!</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="animate-fadeIn">
                <div className="bg-slate-900 border border-slate-700 rounded-lg p-4 mb-4 h-64 overflow-y-auto hover:border-blue-500/50 transition-colors">
                  <pre className="text-sm text-slate-300 whitespace-pre-wrap break-words font-mono">
                    {prompt}
                  </pre>
                </div>

                <div className="grid grid-cols-4 gap-3 mb-4">
                  <button
                    onClick={copyToClipboard}
                    className="col-span-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold py-3 rounded-lg transition-all flex items-center justify-center gap-2 transform hover:scale-105 active:scale-95"
                  >
                    {copied ? (
                      <>
                        <Check className="w-5 h-5 animate-bounce" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-5 h-5" />
                        Copy
                      </>
                    )}
                  </button>

                  <button
                    onClick={downloadPrompt}
                    className="col-span-1 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold py-3 rounded-lg transition-all flex items-center justify-center gap-2 transform hover:scale-105 active:scale-95"
                  >
                    <Download className="w-5 h-5" />
                    Download TXT
                  </button>

                  <button
                    onClick={printPrompt}
                    className="col-span-1 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-semibold py-3 rounded-lg transition-all flex items-center justify-center gap-2 transform hover:scale-105 active:scale-95"
                  >
                    <Download className="w-5 h-5" />
                    Print/Save PDF
                  </button>

                  <button
                    onClick={openClaude}
                    className="col-span-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-3 rounded-lg transition-all flex items-center justify-center gap-2 transform hover:scale-105 active:scale-95"
                  >
                    <ExternalLink className="w-5 h-5" />
                    Claude
                  </button>
                </div>

                <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-blue-700/50 rounded-lg p-4 mb-4 hover:border-blue-500 transition-colors">
                  <h3 className="font-semibold text-blue-300 mb-2 flex items-center gap-2">
                    <BookOpen className="w-5 h-5" />
                    How to Use (Free):
                  </h3>
                  <ol className="text-sm text-slate-300 space-y-2 list-decimal list-inside">
                    <li>Click <strong className="text-green-400">"Copy"</strong> or <strong className="text-blue-400">"Download"</strong> the prompt</li>
                    <li>Click <strong className="text-purple-400">"Claude"</strong> to open Claude.ai</li>
                    <li>Paste the prompt into Claude.ai chat</li>
                    <li>Get your professional documentation instantly</li>
                    <li>Copy the result and paste it below to save (optional)</li>
                  </ol>
                </div>

                {/* Documentation Result */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-slate-300 flex items-center gap-2">
                      Documentation Result (Optional)
                      {documentation.trim() && (
                        <span className="text-xs text-green-400 flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          Ready to download
                        </span>
                      )}
                    </label>
                    <div className="flex items-center gap-2">
                      {documentation.trim() && (
                        <button
                          onClick={downloadDocumentation}
                          className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-sm font-semibold py-1 px-3 rounded transition-all flex items-center gap-1 transform hover:scale-105 active:scale-95"
                        >
                          <Download className="w-4 h-4" />
                          Download MD
                        </button>
                      )}
                      {documentation.trim() && (
                        <button
                          onClick={printDocumentation}
                          className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white text-sm font-semibold py-1 px-3 rounded transition-all flex items-center gap-1 transform hover:scale-105 active:scale-95"
                        >
                          <Download className="w-4 h-4" />
                          Print/Save PDF
                        </button>
                      )}
                      <button
                        onClick={generateShareLink}
                        className="bg-slate-700 hover:bg-slate-600 text-white text-sm font-semibold py-1 px-3 rounded transition-all flex items-center gap-1 transform hover:scale-105 active:scale-95"
                      >
                        Share
                      </button>
                    </div>
                  </div>
                  <textarea
                    value={documentation}
                    onChange={(e) => setDocumentation(e.target.value)}
                    placeholder="Paste Claude's documentation response here to save it..."
                    className="w-full h-48 bg-slate-700 text-white rounded-lg px-4 py-3 text-sm border border-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none transition-all hover:border-purple-400"
                  />
                </div>

                {/* instant issues */}
                <div className="mt-4">
                  <h3 className="text-sm font-semibold text-slate-300 mb-2">Instant Issues Finder</h3>
                  {issues.length === 0 ? (
                    <div className="text-xs text-slate-400">No issues found — great!</div>
                  ) : (
                    <ul className="text-xs text-slate-300 space-y-1">
                      {issues.map((it, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <div className="text-yellow-300">•</div>
                          <div>
                            <div className="font-semibold text-slate-200">{it.type}</div>
                            <div className="text-slate-400">{it.detail}</div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {shareUrl && (
                  <div className="mt-3 text-xs text-slate-300">
                    Share URL (copied): <span className="text-blue-300 break-all">{shareUrl}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out;
        }
        /* Minimal color styles for highlighted preview using Tailwind-like classes */
        .text-slate-400 { color: #94a3b8; }
        .text-green-300 { color: #86efac; }
        .text-yellow-300 { color: #facc15; }
        .text-purple-300 { color: #c084fc; }
        .font-semibold { font-weight: 600; }
        pre { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, monospace; }
      `}</style>
    </div>
  );
}

export default App;
