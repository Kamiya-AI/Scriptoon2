// ===== Scriptoon 2 - メインアプリケーションロジック =====

// --- DOM要素の参照 ---
const settingsModal = document.getElementById('settingsModal');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');
const apiKeyInput = document.getElementById('apiKeyInput');
const saveApiKeyBtn = document.getElementById('saveApiKeyBtn');
const deleteApiKeyBtn = document.getElementById('deleteApiKeyBtn');
const settingsBtn = document.getElementById('settingsBtn');
const apiWarning = document.getElementById('apiWarning');

const imageViewerModal = document.getElementById('imageViewerModal');
const closeViewerBtn = document.getElementById('closeViewerBtn');
const viewerImage = document.getElementById('viewerImage');



const statusBar = document.getElementById('statusBar');
const statusMessage = document.getElementById('statusMessage');
const statusSpinner = document.getElementById('statusSpinner');

const manuscriptInput = document.getElementById('manuscriptInput');
const clearManuscriptBtn = document.getElementById('clearManuscriptBtn');
const suggestCharBtn = document.getElementById('suggestCharBtn');
const characterSettingsContainer = document.getElementById('characterSettingsContainer');
const create3ViewBtn = document.getElementById('create3ViewBtn');
const charCustomPromptInput = document.getElementById('charCustomPrompt');
const createEkonte12Btn = document.getElementById('createEkonte12Btn');
const createEkonte3Btn = document.getElementById('createEkonte3Btn');
const createEkonteBtn = document.getElementById('createEkonteBtn');

const charImageZone = document.getElementById('charImageZone');
const charDropPlaceholder = document.getElementById('charDropPlaceholder');
const charImageGrid = document.getElementById('charImageGrid');
const charImageInput = document.getElementById('charImageInput');
const exportCharBtn = document.getElementById('exportCharBtn');

const charRefImageZone = document.getElementById('charRefImageZone');
const charRefDropPlaceholder = document.getElementById('charRefPlaceholder');
const charRefImageGrid = document.getElementById('charRefImageGrid');
const charRefImageInput = document.getElementById('charRefImageInput');

const ekonteContent = document.getElementById('ekonteContent');
const copyTextBtn = document.getElementById('copyTextBtn');
const clearStoryboardBtn = document.getElementById('clearStoryboardBtn');

const numImagesSelect = document.getElementById('numImages');
const aspectRatioSelect = document.getElementById('aspectRatio');
const resolutionSelect = document.getElementById('resolution');
const outputFormatSelect = document.getElementById('outputFormat');
const customPromptInput = document.getElementById('customPrompt');

const registerScenesBtn = document.getElementById('registerScenesBtn');
const bulkGenerateBtn = document.getElementById('bulkGenerateBtn');
const bulkSaveBtn = document.getElementById('bulkSaveBtn');
const bulkDeleteBtn = document.getElementById('bulkDeleteBtn');
const totalPageCountSpan = document.getElementById('totalPageCount');

const scenesContainer = document.getElementById('scenesContainer');

// --- 状態管理 ---
let charImages = []; // { dataUrl, fileName }
let charRefImages = []; // { dataUrl, fileName, id } 参照画像用
let charSettingsData = []; // { label, content } - キャラごとの設定データ
let scenes = []; // { id, title, content, images: [{ dataUrl, markers: { green: false, red: false } }] }

let isProcessing = false;
let isBulkGenerating = false;
let abortBulkGeneration = false;
let currentProcessingSceneId = -1; // 現在処理中のシーンID（またはIndex）
let abortCurrentSceneGeneration = false;

// --- キュー管理 ---
let generationQueue = []; // { sceneIndex, numImages, customPrompt, resolution, aspectRatio, type: 'single'|'bulk' }
let isQueueProcessing = false; // キュー処理ループが実行中かどうか

// 事前登録画像1のBase64 (初回ロード時に読み込み)
let templateImageBase64 = null;

// ===== API設定 =====
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL_GEMINI_PRO = 'google/gemini-3-pro-preview';
const MODEL_NANOBANANA = 'google/gemini-3-pro-image-preview';

// ===== 初期化 =====
window.addEventListener('DOMContentLoaded', () => {
  // APIキー読み込み
  const savedKey = localStorage.getItem('scriptoon2_api_key');
  if (savedKey) apiKeyInput.value = savedKey;
  checkApiKey();

  // 設定の読み込み
  loadSettings();

  // 保存されたデータの読み込み
  loadSavedData();
  updateTotalPageCount(); // 初期表示更新

  // 事前登録画像1の読み込み
  loadTemplateImage();
});

// ===== ユーティリティ =====
function showStatus(message, showSpinner = true) {
  statusBar.style.display = 'flex';
  statusMessage.textContent = message;
  statusSpinner.style.display = showSpinner ? 'block' : 'none';
}

function hideStatus() {
  statusBar.style.display = 'none';
}

function checkApiKey() {
  const key = localStorage.getItem('scriptoon2_api_key');
  const hasKey = key && key.trim().length > 0;
  if (hasKey) {
    apiWarning.classList.remove('show');
  } else {
    apiWarning.classList.add('show');
  }
  return hasKey;
}

function getApiKey() {
  return localStorage.getItem('scriptoon2_api_key') || '';
}

// ===== 設定保存/読み込み =====
function loadSettings() {
  const settings = ['numImages', 'aspectRatio', 'resolution', 'outputFormat'];
  const selects = [numImagesSelect, aspectRatioSelect, resolutionSelect, outputFormatSelect];
  settings.forEach((key, i) => {
    const saved = localStorage.getItem(`scriptoon2_${key}`);
    if (saved && selects[i]) selects[i].value = saved;
  });

  const savedManuscript = localStorage.getItem('scriptoon2_manuscript');
  if (savedManuscript) manuscriptInput.value = savedManuscript;

  const savedCharSettings = localStorage.getItem('scriptoon2_charSettingsData');
  if (savedCharSettings) {
    try {
      charSettingsData = JSON.parse(savedCharSettings);
      renderCharSettings();
    } catch (e) { charSettingsData = []; }
  }

  const savedEkonte = localStorage.getItem('scriptoon2_ekonte');
  if (savedEkonte) ekonteContent.value = savedEkonte;

  const savedCustomPrompt = localStorage.getItem('scriptoon2_customPrompt');
  if (savedCustomPrompt) customPromptInput.value = savedCustomPrompt;

  const savedCharCustomPrompt = localStorage.getItem('scriptoon2_charCustomPrompt');
  if (savedCharCustomPrompt) charCustomPromptInput.value = savedCharCustomPrompt;
}

function saveSettings() {
  localStorage.setItem('scriptoon2_numImages', numImagesSelect.value);
  localStorage.setItem('scriptoon2_aspectRatio', aspectRatioSelect.value);
  localStorage.setItem('scriptoon2_resolution', resolutionSelect.value);
  localStorage.setItem('scriptoon2_outputFormat', outputFormatSelect.value);
}

function loadSavedData() {
  // キャラ画像
  const savedCharImages = localStorage.getItem('scriptoon2_charImages');
  if (savedCharImages) {
    try {
      charImages = JSON.parse(savedCharImages);
      renderCharImages();
    } catch (e) { charImages = []; }
  }

  // シーン
  const savedScenes = localStorage.getItem('scriptoon2_scenes');
  if (savedScenes) {
    try {
      scenes = JSON.parse(savedScenes);
      renderScenes();
    } catch (e) { scenes = []; }
  }
}

function saveCharImages() {
  try {
    localStorage.setItem('scriptoon2_charImages', JSON.stringify(charImages));
  } catch (e) {
    console.error('Failed to save char images:', e);
  }
}

function saveScenes() {
  try {
    localStorage.setItem('scriptoon2_scenes', JSON.stringify(scenes));
  } catch (e) {
    console.error('Failed to save scenes:', e);
  }
}

// 事前登録画像1をBase64で読み込む（同一ディレクトリのtemplate_3view.pngを自動fetch）
async function loadTemplateImage() {
  try {
    // まずlocalStorageキャッシュを確認
    const saved = localStorage.getItem('scriptoon2_templateImage');
    if (saved) {
      templateImageBase64 = saved;
      console.log('[Template] キャッシュからテンプレート画像を読み込みました');
      return;
    }

    // 同一ディレクトリのtemplate_3view.pngをfetchで読み込む
    const response = await fetch('template_3view.png');
    if (!response.ok) {
      console.warn('[Template] テンプレート画像の読み込みに失敗しました (HTTP', response.status, ')');
      return;
    }

    const blob = await response.blob();

    // FileReaderをPromiseでラップして確実にawaitで待つ
    templateImageBase64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(e);
      reader.readAsDataURL(blob);
    });

    // localStorageにキャッシュ
    try {
      localStorage.setItem('scriptoon2_templateImage', templateImageBase64);
    } catch (storageErr) {
      console.warn('[Template] localStorageへの保存に失敗（サイズ超過の可能性）');
    }
    console.log('[Template] テンプレート画像を正常に読み込みました (' + blob.size + ' bytes)');
  } catch (e) {
    console.error('[Template] テンプレート画像の読み込みエラー:', e);
  }
}

// ===== API呼び出し =====

// Gemini Pro テキスト生成
async function callGeminiPro(systemPrompt, userContent) {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('APIキーが設定されていません');

  const messages = [
    { role: 'user', content: systemPrompt + '\n\n---\n\n' + userContent }
  ];

  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: MODEL_GEMINI_PRO,
      messages: messages
    })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`API Error (${response.status}): ${err}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// Gemini Pro チャット（会話履歴付き）
async function callGeminiProChat(messages) {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('APIキーが設定されていません');

  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: MODEL_GEMINI_PRO,
      messages: messages
    })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`API Error (${response.status}): ${err}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// Nanobanana Pro 画像生成
async function callNanobanana(prompt, referenceImages = []) {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('APIキーが設定されていません');

  // メッセージを構築
  const contentParts = [];

  // 参照画像を添付
  for (const img of referenceImages) {
    const base64Data = img.dataUrl.split(',')[1];
    const mimeType = img.dataUrl.split(';')[0].split(':')[1] || 'image/png';
    contentParts.push({
      type: 'image_url',
      image_url: {
        url: `data:${mimeType};base64,${base64Data}`
      }
    });
  }

  // テキストプロンプト
  contentParts.push({
    type: 'text',
    text: prompt
  });

  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: MODEL_NANOBANANA,
      messages: [
        { role: 'user', content: contentParts }
      ],
      modalities: ['image', 'text']
    })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`API Error (${response.status}): ${err}`);
  }

  const data = await response.json();
  console.log('[Nanobanana] APIレスポンス全体:', JSON.stringify(data).substring(0, 500));
  return data;
}

// API応答から画像を抽出（複数の応答フォーマットに対応）
function extractImagesFromResponse(response) {
  const images = [];
  console.log('[extractImages] レスポンス構造:', Object.keys(response));

  if (response.choices) {
    for (const choice of response.choices) {
      const msg = choice.message;
      console.log('[extractImages] message keys:', Object.keys(msg));
      console.log('[extractImages] content type:', typeof msg.content,
        Array.isArray(msg.content) ? '(array, length=' + msg.content.length + ')' : '');

      if (msg.content) {
        if (typeof msg.content === 'string') {
          // パターン1: 文字列中にBase64データURIが埋め込まれている
          const dataUriMatches = msg.content.match(/data:image\/[^;]+;base64,[A-Za-z0-9+/=\n\r]+/g);
          if (dataUriMatches) {
            dataUriMatches.forEach(m => {
              // 改行を除去
              images.push(m.replace(/[\n\r]/g, ''));
            });
            console.log('[extractImages] 文字列からdata URI抽出:', dataUriMatches.length, '枚');
          }
        } else if (Array.isArray(msg.content)) {
          for (const part of msg.content) {
            console.log('[extractImages] part type:', part.type, 'keys:', Object.keys(part));

            // パターン2: image_url形式（OpenRouter標準）
            if (part.type === 'image_url' && part.image_url && part.image_url.url) {
              images.push(part.image_url.url);
              console.log('[extractImages] image_url形式で抽出');
            }
            // パターン3: inline_data形式（Gemini native）
            else if (part.type === 'inline_data' && part.inline_data) {
              const mime = part.inline_data.mime_type || 'image/png';
              const b64 = part.inline_data.data;
              images.push(`data:${mime};base64,${b64}`);
              console.log('[extractImages] inline_data形式で抽出');
            }
            // パターン4: source形式（Anthropic Claude風）
            else if (part.type === 'image' && part.source && part.source.data) {
              const mime = part.source.media_type || 'image/png';
              images.push(`data:${mime};base64,${part.source.data}`);
              console.log('[extractImages] source形式で抽出');
            }
            // パターン5: b64_json / image含む任意フィールド
            else if (part.b64_json) {
              images.push(`data:image/png;base64,${part.b64_json}`);
              console.log('[extractImages] b64_json形式で抽出');
            }
            // パターン6: テキスト部分にbase64が含まれている
            else if (part.type === 'text' && part.text) {
              const textMatches = part.text.match(/data:image\/[^;]+;base64,[A-Za-z0-9+/=\n\r]+/g);
              if (textMatches) {
                textMatches.forEach(m => images.push(m.replace(/[\n\r]/g, '')));
                console.log('[extractImages] テキスト部分からdata URI抽出:', textMatches.length, '枚');
              }
            }
          }
        }
      }

      // パターン7: message直下にimage/imagesフィールドがある場合
      if (msg.images && Array.isArray(msg.images)) {
        for (const imgItem of msg.images) {
          console.log('[extractImages] images要素の型:', typeof imgItem);
          if (typeof imgItem === 'object' && imgItem !== null) {
            console.log('[extractImages] images要素のkeys:', Object.keys(imgItem));
            console.log('[extractImages] images要素の内容(先頭200文字):', JSON.stringify(imgItem).substring(0, 200));
          }

          let extracted = false;

          if (typeof imgItem === 'string') {
            if (imgItem.startsWith('data:')) {
              images.push(imgItem);
            } else {
              images.push(`data:image/png;base64,${imgItem}`);
            }
            extracted = true;
          } else if (imgItem && typeof imgItem === 'object') {
            // { type: "image_url", image_url: { url: "data:..." } } 形式（OpenRouter Gemini）
            if (imgItem.image_url && imgItem.image_url.url) {
              images.push(imgItem.image_url.url);
              extracted = true;
              console.log('[extractImages] image_url.url形式で抽出成功');
            }
            // { url: "..." } 形式
            if (!extracted && imgItem.url) {
              images.push(imgItem.url);
              extracted = true;
            }
            // { b64_json: "..." } 形式
            if (!extracted && imgItem.b64_json) {
              images.push(`data:image/png;base64,${imgItem.b64_json}`);
              extracted = true;
            }
            // { data: "...", mime_type: "..." } 形式
            if (!extracted && imgItem.data) {
              const mime = imgItem.mime_type || imgItem.media_type || 'image/png';
              images.push(`data:${mime};base64,${imgItem.data}`);
              extracted = true;
            }
            // { base64: "..." } 形式
            if (!extracted && imgItem.base64) {
              images.push(`data:image/png;base64,${imgItem.base64}`);
              extracted = true;
            }
            // { image: "..." } 形式
            if (!extracted && imgItem.image) {
              if (typeof imgItem.image === 'string') {
                if (imgItem.image.startsWith('data:')) {
                  images.push(imgItem.image);
                } else {
                  images.push(`data:image/png;base64,${imgItem.image}`);
                }
                extracted = true;
              }
            }

            // フォールバック: 全プロパティを走査してbase64データを探す
            if (!extracted) {
              for (const key of Object.keys(imgItem)) {
                const val = imgItem[key];
                if (typeof val === 'string' && val.length > 100) {
                  // 長い文字列はbase64データの可能性が高い
                  if (val.startsWith('data:image')) {
                    images.push(val);
                    extracted = true;
                    console.log('[extractImages] フォールバック: キー', key, 'からdata URI抽出');
                    break;
                  } else if (/^[A-Za-z0-9+/=\r\n]+$/.test(val.substring(0, 100))) {
                    images.push(`data:image/png;base64,${val}`);
                    extracted = true;
                    console.log('[extractImages] フォールバック: キー', key, 'からbase64抽出');
                    break;
                  }
                }
              }
            }

            if (!extracted) {
              console.warn('[extractImages] 画像要素を解析できませんでした:', JSON.stringify(imgItem).substring(0, 500));
            }
          }
        }
        console.log('[extractImages] msg.images配列処理完了, images配列の現在数:', images.length);
      }
      // msg.image（単数形）
      if (msg.image) {
        if (typeof msg.image === 'string') {
          if (msg.image.startsWith('data:')) {
            images.push(msg.image);
          } else {
            images.push(`data:image/png;base64,${msg.image}`);
          }
          console.log('[extractImages] msg.image形式で抽出');
        }
      }
    }
  }

  // パターン8: choices外にdataフィールドがある場合（DALL-E風）
  if (response.data && Array.isArray(response.data)) {
    for (const item of response.data) {
      if (item.b64_json) {
        images.push(`data:image/png;base64,${item.b64_json}`);
        console.log('[extractImages] response.data.b64_json形式で抽出');
      }
      if (item.url) {
        images.push(item.url);
        console.log('[extractImages] response.data.url形式で抽出');
      }
    }
  }

  console.log('[extractImages] 合計抽出画像数:', images.length);
  if (images.length === 0) {
    console.warn('[extractImages] 画像が見つかりませんでした。レスポンス全体:', JSON.stringify(response).substring(0, 1000));
  }

  return images;
}


// ===== 設定モーダル =====
settingsBtn.addEventListener('click', () => {
  settingsModal.style.display = 'flex';
  const savedKey = localStorage.getItem('scriptoon2_api_key');
  if (savedKey) apiKeyInput.value = savedKey;
});

closeSettingsBtn.addEventListener('click', () => {
  settingsModal.style.display = 'none';
});

settingsModal.addEventListener('click', (e) => {
  if (e.target === settingsModal) settingsModal.style.display = 'none';
});

saveApiKeyBtn.addEventListener('click', () => {
  const key = apiKeyInput.value.trim();
  if (key) {
    localStorage.setItem('scriptoon2_api_key', key);
    checkApiKey();
    alert('APIキーを保存しました');
    settingsModal.style.display = 'none';
  } else {
    alert('APIキーを入力してください');
  }
});

deleteApiKeyBtn.addEventListener('click', () => {
  if (confirm('APIキーを削除しますか？')) {
    localStorage.removeItem('scriptoon2_api_key');
    apiKeyInput.value = '';
    checkApiKey();
    alert('APIキーを削除しました');
  }
});

// ===== 画像ビューア =====
function openImageViewer(src) {
  viewerImage.src = src;
  imageViewerModal.style.display = 'flex';
}

closeViewerBtn.addEventListener('click', () => {
  imageViewerModal.style.display = 'none';
});

imageViewerModal.addEventListener('click', (e) => {
  if (e.target === imageViewerModal) imageViewerModal.style.display = 'none';
});

// ===== 自動保存 =====
manuscriptInput.addEventListener('input', () => {
  localStorage.setItem('scriptoon2_manuscript', manuscriptInput.value);
});

// キャラ設定の保存
function saveCharSettings() {
  try {
    localStorage.setItem('scriptoon2_charSettingsData', JSON.stringify(charSettingsData));
  } catch (e) {
    console.error('Failed to save char settings:', e);
  }
}

// No.○○ でAI応答をキャラごとに分割
function parseCharacterBlocks(text) {
  // No.○○パターン: No.01、No.02、No01、No02、No.１ 等に対応
  const noPattern = /No[.．]?\s*[0-9０-９]+/i;
  const blocks = text.split(/(?=No[.．]?\s*[0-9０-９]+)/i).filter(b => b.trim());

  // No.○○で始まるブロックのみ抽出（冒頭のまとめ文等を除外）
  const charBlocks = blocks.filter(block => noPattern.test(block.substring(0, 30)));

  // 重複排除（No.番号をキーにして最初の出現のみ保持）
  const seen = new Set();
  const uniqueBlocks = [];
  for (const block of charBlocks) {
    const numMatch = block.match(/No[.．]?\s*([0-9０-９]+)/i);
    if (numMatch) {
      // 全角数字を半角に変換してキーにする
      const num = numMatch[1].replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0));
      if (!seen.has(num)) {
        seen.add(num);
        uniqueBlocks.push(block);
      }
    } else {
      uniqueBlocks.push(block);
    }
  }

  return uniqueBlocks.map(block => {
    // 1行目をラベルとして抽出
    const firstLine = block.split('\n')[0].trim();
    return { label: firstLine, content: block.trim(), checked: true };
  });
}

// キャラクター設定をカード表示
function renderCharSettings() {
  characterSettingsContainer.innerHTML = '';

  if (charSettingsData.length === 0) {
    characterSettingsContainer.innerHTML = '<div class="no-char-message">キャラクター設定がここに表示されます</div>';
    return;
  }

  charSettingsData.forEach((charData, index) => {
    const card = document.createElement('div');
    card.className = 'char-setting-card';

    // ヘッダー（チェックボックス + ラベル + 開閉アイコン）
    const header = document.createElement('div');
    header.className = 'char-setting-header';

    // チェックボックス（3面図作成対象選択用）
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'char-checkbox';
    checkbox.checked = charData.checked !== false;
    checkbox.title = '3面図作成対象';
    checkbox.addEventListener('click', (e) => {
      e.stopPropagation();
      charSettingsData[index].checked = checkbox.checked;
      saveCharSettings();
    });

    const labelSpan = document.createElement('span');
    labelSpan.className = 'char-header-label';
    labelSpan.textContent = charData.label;

    const toggleIcon = document.createElement('span');
    toggleIcon.className = 'toggle-icon collapsed';
    toggleIcon.textContent = '▼';

    const headerLeft = document.createElement('div');
    headerLeft.className = 'char-header-left';
    headerLeft.appendChild(checkbox);
    headerLeft.appendChild(labelSpan);

    header.appendChild(headerLeft);
    header.appendChild(toggleIcon);

    // ボディ（テキストエリア） - 初期状態は閉じた状態
    const body = document.createElement('div');
    body.className = 'char-setting-body collapsed';

    const textarea = document.createElement('textarea');
    textarea.value = charData.content;

    textarea.addEventListener('input', (e) => {
      charSettingsData[index].content = e.target.value;
      saveCharSettings();
    });

    // 開閉トグル（チェックボックス以外のクリックで）
    header.addEventListener('click', (e) => {
      if (e.target === checkbox) return;
      body.classList.toggle('collapsed');
      toggleIcon.classList.toggle('collapsed');
    });

    body.appendChild(textarea);
    card.appendChild(header);
    card.appendChild(body);
    characterSettingsContainer.appendChild(card);
  });
}

// 全キャラ設定テキストを結合して取得するヘルパー
function getAllCharSettingsText() {
  return charSettingsData.map(c => c.content).join('\n\n');
}

ekonteContent.addEventListener('input', () => {
  localStorage.setItem('scriptoon2_ekonte', ekonteContent.value);
});

customPromptInput.addEventListener('input', () => {
  localStorage.setItem('scriptoon2_customPrompt', customPromptInput.value);
});

charCustomPromptInput.addEventListener('input', () => {
  localStorage.setItem('scriptoon2_charCustomPrompt', charCustomPromptInput.value);
});

[numImagesSelect, aspectRatioSelect, resolutionSelect, outputFormatSelect].forEach(sel => {
  sel.addEventListener('change', saveSettings);
});

// ===== 機能1: キャラを提案する =====
suggestCharBtn.addEventListener('click', async () => {
  if (isProcessing) return;
  if (!checkApiKey()) { alert('APIキーを設定してください'); return; }

  const manuscript = manuscriptInput.value.trim();
  if (!manuscript) { alert('原稿を入力してください'); return; }

  isProcessing = true;
  suggestCharBtn.disabled = true;
  showStatus('キャラクター設定を生成中...');

  try {
    const result = await callGeminiPro(PROMPT_1_CHARACTER_SUGGEST, manuscript);
    // No.○○ でキャラごとに分割してカード表示
    charSettingsData = parseCharacterBlocks(result);
    renderCharSettings();
    saveCharSettings();
    hideStatus();
  } catch (error) {
    hideStatus();
    alert('エラー: ' + error.message);
  } finally {
    isProcessing = false;
    suggestCharBtn.disabled = false;
  }
});

// ===== 機能2: キャラクター3面図を作成 =====
create3ViewBtn.addEventListener('click', async () => {
  if (isProcessing) return;
  if (!checkApiKey()) { alert('APIキーを設定してください'); return; }

  // チェックが入っているキャラのみ取得（letに変更）
  let selectedChars = charSettingsData.filter(c => c.checked !== false);

  // キャラ選択がなく、参照画像がある場合はダミーキャラとして処理
  if (selectedChars.length === 0 && (charRefImages.length > 0 || templateImageBase64)) {
    selectedChars = [{ label: '新規キャラクター', content: '', isDummy: true }];
  }

  if (selectedChars.length === 0) { alert('3面図を作成するキャラクターをチェックするか、参照画像を追加してください'); return; }

  isProcessing = true;
  create3ViewBtn.disabled = true;
  showStatus('キャラクター3面図を生成中...');

  try {
    const referenceImages = [];

    // テンプレート画像があればref追加
    if (templateImageBase64) {
      referenceImages.push({ dataUrl: templateImageBase64 });
      console.log('[3面図] テンプレート画像を参照に追加しました (' + templateImageBase64.length + ' chars)');
    } else {
      console.warn('[3面図] テンプレート画像が読み込まれていません');
    }
    console.log('[3面図] 参照画像数:', referenceImages.length);

    // 追加の参照画像があれば追加
    if (charRefImages && charRefImages.length > 0) {
      charRefImages.forEach(img => {
        referenceImages.push({ dataUrl: img.dataUrl });
      });
      console.log('[3面図] ユーザー追加の参照画像を追加しました:', charRefImages.length, '枚');
    }

    for (let i = 0; i < selectedChars.length; i++) {
      showStatus(`キャラクター ${i + 1}/${selectedChars.length} の3面図を生成中...`);
      const charBlock = selectedChars[i].content;
      const charCustomText = charCustomPromptInput.value.trim();
      const fullCharBlock = charCustomText ? charBlock + '\n\n' + charCustomText : charBlock;
      const prompt = PROMPT_2_CHARACTER_3VIEW + fullCharBlock
        + '\n\n画像設定: アスペクト比 2:3, 解像度 2K, 出力形式 PNG';

      const response = await callNanobanana(prompt, referenceImages);
      const images = extractImagesFromResponse(response);

      // 生成された画像を1枚のみcharImagesに追加（既存の画像は消さない）
      if (images.length > 0) {
        const charName = selectedChars[i].label.replace(/[/\\?*:"<>|]/g, '_');
        charImages.push({ dataUrl: images[0], fileName: `${charName}_3view.png` });
      }
    }

    renderCharImages();
    saveCharImages();
    hideStatus();
  } catch (error) {
    hideStatus();
    alert('エラー: ' + error.message);
  } finally {
    isProcessing = false;
    create3ViewBtn.disabled = false;
  }
});



// ===== 機能2.5: 参照画像のD&D/クリック登録 =====
charRefImageZone.addEventListener('click', (e) => {
  if (e.target.closest('.char-image-item') || e.target.closest('.remove-btn')) return;
  charRefImageInput.click();
});

charRefImageInput.addEventListener('change', (e) => {
  handleCharRefFiles(e.target.files);
  charRefImageInput.value = '';
});

charRefImageZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  charRefImageZone.classList.add('dragover');
});

charRefImageZone.addEventListener('dragleave', (e) => {
  if (e.target === charRefImageZone || !charRefImageZone.contains(e.relatedTarget)) {
    charRefImageZone.classList.remove('dragover');
  }
});

charRefImageZone.addEventListener('drop', (e) => {
  e.preventDefault();
  charRefImageZone.classList.remove('dragover');
  handleCharRefFiles(e.dataTransfer.files);
});

async function handleCharRefFiles(files) {
  for (const file of files) {
    if (file.type.startsWith('image/')) {
      const dataUrl = await readFileAsDataUrl(file);
      charRefImages.push({ dataUrl, fileName: file.name, id: Date.now() + Math.random() });
    }
  }
  renderCharRefImages();
}

function renderCharRefImages() {
  charRefImageGrid.innerHTML = '';
  if (charRefImages.length === 0) {
    charRefDropPlaceholder.classList.remove('hidden');
  } else {
    charRefDropPlaceholder.classList.add('hidden');
    charRefImages.forEach((img, index) => {
      const item = document.createElement('div');
      item.className = 'char-image-item';

      const imgEl = document.createElement('img');
      imgEl.src = img.dataUrl;
      imgEl.alt = img.fileName;
      imgEl.addEventListener('click', () => openImageViewer(img.dataUrl));

      const removeBtn = document.createElement('button');
      removeBtn.className = 'remove-btn';
      removeBtn.textContent = '×';
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        charRefImages.splice(index, 1);
        renderCharRefImages();
      });

      item.appendChild(imgEl);
      item.appendChild(removeBtn);
      charRefImageGrid.appendChild(item);
    });
  }
}

// ===== 機能3: キャラ画像のD&D/クリック登録 =====
charImageZone.addEventListener('click', (e) => {
  if (e.target.closest('.char-image-item') || e.target.closest('.remove-btn')) return;
  charImageInput.click();
});

charImageInput.addEventListener('change', (e) => {
  handleCharImageFiles(e.target.files);
  charImageInput.value = '';
});

charImageZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  charImageZone.classList.add('dragover');
});

charImageZone.addEventListener('dragleave', (e) => {
  if (e.target === charImageZone || !charImageZone.contains(e.relatedTarget)) {
    charImageZone.classList.remove('dragover');
  }
});

charImageZone.addEventListener('drop', (e) => {
  e.preventDefault();
  charImageZone.classList.remove('dragover');
  handleCharImageFiles(e.dataTransfer.files);
});

async function handleCharImageFiles(files) {
  for (const file of files) {
    if (file.type.startsWith('image/')) {
      const dataUrl = await readFileAsDataUrl(file);
      charImages.push({ dataUrl, fileName: file.name });
    }
  }
  renderCharImages();
  saveCharImages();
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function renderCharImages() {
  charImageGrid.innerHTML = '';
  if (charImages.length === 0) {
    charDropPlaceholder.classList.remove('hidden');
  } else {
    charDropPlaceholder.classList.add('hidden');
    charImages.forEach((img, index) => {
      const item = document.createElement('div');
      item.className = 'char-image-item';

      const imgEl = document.createElement('img');
      imgEl.src = img.dataUrl;
      imgEl.alt = img.fileName;
      imgEl.addEventListener('click', () => openImageViewer(img.dataUrl));

      const removeBtn = document.createElement('button');
      removeBtn.className = 'remove-btn';
      removeBtn.textContent = '×';
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        charImages.splice(index, 1);
        renderCharImages();
        saveCharImages();
      });

      // ダウンロードボタン
      const downloadBtn = document.createElement('button');
      downloadBtn.className = 'download-btn';
      downloadBtn.innerHTML = '📥'; // ダウンロードアイコン
      downloadBtn.title = '画像をダウンロード';
      downloadBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const link = document.createElement('a');
        link.href = img.dataUrl;
        link.download = img.fileName || `character_${index + 1}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      });

      item.appendChild(imgEl);
      item.appendChild(removeBtn);
      item.appendChild(downloadBtn);
      charImageGrid.appendChild(item);
    });
  }
}

// ===== 機能4: キャラを出力する =====
exportCharBtn.addEventListener('click', () => {
  if (charImages.length === 0) { alert('出力する画像がありません'); return; }

  charImages.forEach((img, index) => {
    const link = document.createElement('a');
    link.href = img.dataUrl;
    link.download = `character_${index + 1}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });
});

// ===== 機能5: 字コンテ1-2作成 =====
createEkonte12Btn.addEventListener('click', () => {
  const manuscript = manuscriptInput.value;
  processLongManuscript(PROMPT_3_EKONTE_12, manuscript, createEkonte12Btn, '字コンテ1-2を作成中...');
});

// ===== 機能5.5: 字コンテ3作成 =====
createEkonte3Btn.addEventListener('click', () => {
  const manuscript = manuscriptInput.value;
  processLongManuscript(PROMPT_6_EKONTE_3, manuscript, createEkonte3Btn, '字コンテ3を作成中...');
});

// ===== 機能6: 字コンテ作成 =====
createEkonteBtn.addEventListener('click', () => {
  const manuscript = manuscriptInput.value;
  processLongManuscript(PROMPT_4_EKONTE, manuscript, createEkonteBtn, '字コンテを作成中...');
});


// ===== 長文対応処理・共通関数 =====
async function processLongManuscript(prompt, manuscript, btnElement, loadingMessage) {
  if (isProcessing) return;
  if (!checkApiKey()) { alert('APIキーを設定してください'); return; }

  const text = manuscript ? manuscript.trim() : '';
  if (!text) { alert('原稿を入力してください'); return; }

  isProcessing = true;
  btnElement.disabled = true;
  showStatus(loadingMessage + ' (準備中...)');

  try {
    const chunks = splitManuscript(text);
    let fullResult = '';

    for (let i = 0; i < chunks.length; i++) {
      showStatus(`${loadingMessage} (${i + 1}/${chunks.length})`);
      const chunkResult = await callGeminiPro(prompt, chunks[i]);
      fullResult += chunkResult + '\n\n';

      // レート制限対策のウェイト (1秒)
      if (i < chunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // シーン番号リナンバリング
    const finalResult = renumberScenes(fullResult);

    ekonteContent.value = finalResult;
    localStorage.setItem('scriptoon2_ekonte', finalResult);
    hideStatus();
  } catch (error) {
    hideStatus();
    alert('エラー: ' + error.message);
  } finally {
    isProcessing = false;
    btnElement.disabled = false;
  }
}

function splitManuscript(text, chunkSize = 3000) {
  const chunks = [];
  let currentIndex = 0;

  while (currentIndex < text.length) {
    if (text.length - currentIndex <= chunkSize) {
      chunks.push(text.slice(currentIndex));
      break;
    }

    let splitIndex = currentIndex + chunkSize;
    // 句読点「。」や改行を優先して切るために後方検索
    const lastPeriod = text.lastIndexOf('。', splitIndex);
    const lastNewline = text.lastIndexOf('\n', splitIndex);

    // 分割位置からあまりにも離れていない場合（80%以上進んだ位置）に採用
    const minIndex = currentIndex + (chunkSize * 0.8);

    if (lastPeriod > minIndex) {
      splitIndex = lastPeriod + 1;
    } else if (lastNewline > minIndex) {
      splitIndex = lastNewline + 1;
    }

    chunks.push(text.slice(currentIndex, splitIndex));
    currentIndex = splitIndex;
  }
  return chunks;
}

function renumberScenes(text) {
  let count = 1;
  // 「シーン数字」のパターンを検索して連番に置換
  return text.replace(/シーン\s*[0-9０-９]+/g, () => `シーン${count++}`);
}



// ===== テキストをコピー =====
copyTextBtn.addEventListener('click', () => {
  const text = ekonteContent.value.trim();
  if (!text) { alert('コピーするテキストがありません'); return; }

  navigator.clipboard.writeText(text).then(() => {
    // ボタンのテキストを一時的に変更
    const originalText = copyTextBtn.textContent;
    copyTextBtn.textContent = 'コピーしました！';
    setTimeout(() => {
      copyTextBtn.textContent = originalText;
    }, 2000);
  }).catch(err => {
    console.error('コピーに失敗しました:', err);
    alert('コピーに失敗しました');
  });
});

// ===== テキスト削除機能 =====
clearManuscriptBtn.addEventListener('click', () => {
  if (!manuscriptInput.value) return;
  if (confirm('原稿を削除してもよろしいですか？')) {
    manuscriptInput.value = '';
    localStorage.removeItem('scriptoon2_manuscript');
  }
});

clearStoryboardBtn.addEventListener('click', () => {
  if (!ekonteContent.value) return;
  if (confirm('字コンテの内容を削除してもよろしいですか？')) {
    ekonteContent.value = '';
    localStorage.removeItem('scriptoon2_ekonte');
  }
});

// ===== 機能11: シーンを登録する =====
registerScenesBtn.addEventListener('click', () => {
  const ekonteText = ekonteContent.value.trim();
  if (!ekonteText) { alert('字コンテの内容がありません'); return; }

  // ～～～～～ で区切ってブロックに分割
  const blocks = ekonteText.split(/～{3,}/).filter(b => b.trim());

  // 既存のシーン情報をバックアップ（タイトルをキーにする）
  // 重複するタイトルに対応するため、値は配列にする
  // 既存のシーン情報をバックアップ（タイトルをキーにする）
  // 重複するタイトルに対応するため、値は配列にする。
  // さらに、救済措置のためにフラットなリストも管理する。
  const oldScenesMap = new Map();
  const oldScenes = [...scenes]; // フラットなリスト

  scenes.forEach(s => {
    if (!oldScenesMap.has(s.title)) {
      oldScenesMap.set(s.title, []);
    }
    oldScenesMap.get(s.title).push(s);
  });

  scenes = [];

  blocks.forEach((block, blockIndex) => {
    const trimmedBlock = block.trim();
    if (!trimmedBlock) return;

    // ブロック内の全シーン番号を抽出（半角・全角対応）
    const sceneMatches = [...trimmedBlock.matchAll(/シーン\s*([0-9０-９]+)/gi)];

    if (sceneMatches.length === 0) {
      // シーン番号が見つからないブロックはスキップ（冒頭の前文など）
      return;
    }

    // シーン番号を半角数字に正規化して取得
    const sceneNumbers = sceneMatches.map(m => {
      const numStr = m[1].replace(/[０-９]/g, c =>
        String.fromCharCode(c.charCodeAt(0) - 0xFEE0)
      );
      return parseInt(numStr, 10);
    });

    // 昇順ソート（念のため）
    sceneNumbers.sort((a, b) => a - b);

    // タイトル生成: シーン1.2.3 形式
    const title = 'シーン' + sceneNumbers.join('.');

    // 既存のシーン情報があれば画像を引き継ぐ
    let images = [];
    const oldScenesList = oldScenesMap.get(title);
    if (oldScenesList && oldScenesList.length > 0) {
      // 先頭から取り出して割り当てる（重複対応）
      // shift()することで、同じタイトルの2つ目のシーンには、バックアップの2つ目の情報が当たる
      const oldScene = oldScenesList.shift();
      if (oldScene) {
        // 使用済みフラグを立てる（救済措置の対象外にするため）
        oldScene._isReused = true;

        if (oldScene.images && oldScene.images.length > 0) {
          images = oldScene.images;
        }
      }
    }

    scenes.push({
      id: Date.now() + blockIndex,
      title: title,
      sceneNumbers: sceneNumbers,
      content: trimmedBlock,
      images: images
    });
  });

  // ===== 救済処置: 未割り当ての画像付きシーンを元の位置に追加 =====
  oldScenes.forEach(oldScene => {
    // まだ使われておらず、かつ画像を持っている場合
    if (!oldScene._isReused && oldScene.images && oldScene.images.length > 0) {
      scenes.push({
        id: oldScene.id, // IDも維持
        title: oldScene.title, // タイトルも維持（ユーザー要望：変えない）
        sceneNumbers: oldScene.sceneNumbers, // 番号も維持（元の場所に表示するため）
        content: oldScene.content,
        images: oldScene.images,
        _isHistory: true // 内部的に履歴データであることをマーク
      });
    }
  });

  // シーンブロックを最初のシーン番号で昇順ソート
  // 番号が同じ場合は、ID順（作成順）で並べる
  scenes.sort((a, b) => {
    const diff = a.sceneNumbers[0] - b.sceneNumbers[0];
    if (diff !== 0) return diff;
    return a.id - b.id;
  });

  // 登録結果をログ出力
  console.log('[シーン登録] 登録されたブロック数:', scenes.length);
  scenes.forEach(s => console.log('  ', s.title, '- シーン番号:', s.sceneNumbers.join(',')));

  renderScenes();
  saveScenes();
  updateTotalPageCount(); // シーン登録後に更新
});

// ページ数表示を更新
function updateTotalPageCount() {
  if (totalPageCountSpan) {
    totalPageCountSpan.textContent = `全${scenes.length}ページ`;
  }
}

// ===== シーン描画 =====
function renderScenes() {
  scenesContainer.innerHTML = '';

  if (scenes.length === 0) {
    scenesContainer.innerHTML = '<div class="no-scenes-message">シーンを登録してください</div>';
    return;
  }

  scenes.forEach((scene, sceneIndex) => {
    const card = document.createElement('div');
    card.className = 'scene-card';

    // ヘッダー
    const header = document.createElement('div');
    header.className = 'scene-card-header';

    const title = document.createElement('span');
    title.className = 'scene-title';
    title.textContent = scene.title;

    const btnGroup = document.createElement('div');
    btnGroup.style.display = 'flex';
    btnGroup.style.gap = '4px';

    const viewBtn = document.createElement('button');
    viewBtn.className = 'btn btn-secondary';
    viewBtn.textContent = `${scene.title}の内容確認`;
    viewBtn.addEventListener('click', () => {
      const contentArea = card.querySelector('.scene-content-area');
      contentArea.classList.toggle('show');
    });

    const createBtn = document.createElement('button');
    createBtn.id = `createBtn_${sceneIndex}`;
    createBtn.className = 'btn btn-primary';

    // 生成中の場合、ボタンの状態を復元
    if (isProcessing && currentProcessingSceneId === sceneIndex) {
      createBtn.textContent = '中止';
      createBtn.classList.remove('btn-primary');
      createBtn.classList.add('btn-danger');
    } else {
      createBtn.textContent = `${scene.title}を作成`;
    }

    createBtn.addEventListener('click', () => createSceneImages(sceneIndex));

    btnGroup.appendChild(viewBtn);
    btnGroup.appendChild(createBtn);
    header.appendChild(title);
    header.appendChild(btnGroup);

    // 内容確認エリア
    const contentArea = document.createElement('div');
    contentArea.className = 'scene-content-area';

    const contentTextarea = document.createElement('textarea');
    contentTextarea.value = scene.content;
    contentTextarea.addEventListener('input', (e) => {
      scenes[sceneIndex].content = e.target.value;
      saveScenes();
    });
    contentArea.appendChild(contentTextarea);

    // 画像グリッド
    const imagesGrid = document.createElement('div');
    imagesGrid.className = 'scene-images-grid';
    imagesGrid.id = `sceneImages_${sceneIndex}`;

    // ドラッグ＆ドロップ機能を追加
    setupDragAndDrop(imagesGrid, sceneIndex);

    renderSceneImages(imagesGrid, sceneIndex);

    card.appendChild(header);
    card.appendChild(contentArea);
    card.appendChild(imagesGrid);
    scenesContainer.appendChild(card);
  });
}

function renderSceneImages(container, sceneIndex) {
  container.innerHTML = '';
  const scene = scenes[sceneIndex];
  const numImages = parseInt(numImagesSelect.value);

  if (scene.images.length === 0) {
    // プレースホルダー表示
    for (let i = 0; i < numImages; i++) {
      const wrapper = document.createElement('div');
      wrapper.className = 'scene-image-wrapper';

      const item = document.createElement('div');
      item.className = 'scene-image-item';

      const placeholder = document.createElement('div');
      placeholder.className = 'img-placeholder';
      placeholder.textContent = `${i + 1}`;

      item.appendChild(placeholder);
      wrapper.appendChild(item);

      // マーカー
      const markers = createMarkers(sceneIndex, i);
      wrapper.appendChild(markers);

      container.appendChild(wrapper);
    }
  } else {
    scene.images.forEach((img, imgIndex) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'scene-image-wrapper';

      const item = document.createElement('div');
      item.className = 'scene-image-item';

      const imgEl = document.createElement('img');
      imgEl.src = img.dataUrl;
      imgEl.alt = `Scene ${sceneIndex + 1} Image ${imgIndex + 1}`;
      imgEl.addEventListener('click', () => openImageViewer(img.dataUrl));

      // 削除ボタン（×）
      const removeBtn = document.createElement('button');
      removeBtn.className = 'remove-btn';
      removeBtn.innerHTML = '×'; // またはアイコン
      removeBtn.title = '画像を削除';
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // 画像クリック（拡大表示）を防ぐ
        if (confirm('この画像を削除しますか？')) {
          scene.images.splice(imgIndex, 1);
          saveScenes();
          renderSceneImages(container, sceneIndex);
        }
      });

      item.appendChild(imgEl);
      item.appendChild(removeBtn);

      // ダウンロードボタン
      const downloadBtn = document.createElement('button');
      downloadBtn.className = 'download-btn';
      downloadBtn.innerHTML = '📥';
      downloadBtn.title = '画像をダウンロード';
      downloadBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const link = document.createElement('a');
        link.href = img.dataUrl;
        link.download = `${scene.title}_${imgIndex + 1}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      });
      item.appendChild(downloadBtn);

      wrapper.appendChild(item);

      // マーカー（機能13）
      const markers = createMarkers(sceneIndex, imgIndex);
      wrapper.appendChild(markers);

      container.appendChild(wrapper);
    });
  }
}

// ===== 機能13: 画像マーカー =====
function createMarkers(sceneIndex, imageIndex) {
  const markersDiv = document.createElement('div');
  markersDiv.className = 'image-markers';

  // 緑マーカー（参照用）
  const greenDot = document.createElement('div');
  greenDot.className = 'marker-dot';
  const scene = scenes[sceneIndex];
  if (scene.images[imageIndex] && scene.images[imageIndex].markers && scene.images[imageIndex].markers.green) {
    greenDot.classList.add('green');
  }
  greenDot.title = '緑：画像参照に使用';
  greenDot.addEventListener('click', () => {
    if (!scene.images[imageIndex]) return;
    const markers = scene.images[imageIndex].markers || { green: false, red: false };
    markers.green = !markers.green;
    scene.images[imageIndex].markers = markers;
    greenDot.classList.toggle('green');
    saveScenes();
  });

  // 赤マーカー（出力用）
  const redDot = document.createElement('div');
  redDot.className = 'marker-dot';
  if (scene.images[imageIndex] && scene.images[imageIndex].markers && scene.images[imageIndex].markers.red) {
    redDot.classList.add('red');
  }
  redDot.title = '赤：一括保存の対象';
  redDot.addEventListener('click', () => {
    if (!scene.images[imageIndex]) return;
    const markers = scene.images[imageIndex].markers || { green: false, red: false };
    markers.red = !markers.red;
    scene.images[imageIndex].markers = markers;
    redDot.classList.toggle('red');
    saveScenes();
  });

  markersDiv.appendChild(greenDot);
  markersDiv.appendChild(redDot);
  return markersDiv;
}

// ===== 機能12: シーン画像を作成 =====
// ===== 機能12: シーン画像を作成 (キューイング対応版) =====
async function createSceneImages(sceneIndex) {
  // 1. 実行中の中断処理（自分が実行中の場合）
  if (isProcessing && currentProcessingSceneId === sceneIndex) {
    if (confirm('画像の生成を中止しますか？')) {
      abortCurrentSceneGeneration = true;
      const btn = document.getElementById(`createBtn_${sceneIndex}`);
      if (btn) {
        btn.textContent = '中止中...';
        btn.disabled = true;
      }
    }
    return;
  }

  // 2. 待機中のキャンセル処理（自分が待機中の場合）
  const queueIndex = generationQueue.findIndex(t => t.sceneIndex === sceneIndex);
  if (queueIndex !== -1) {
    // 待機中
    if (confirm('待機中の生成を取り消しますか？')) {
      generationQueue.splice(queueIndex, 1);

      // ボタンを元に戻す
      const btn = document.getElementById(`createBtn_${sceneIndex}`);
      const scene = scenes[sceneIndex];
      if (btn && scene) {
        btn.textContent = `${scene.title}を作成`;
        btn.classList.remove('btn-secondary', 'btn-warning');
        btn.classList.add('btn-primary');
      }
    }
    return;
  }

  // 3. 新規キュー追加
  if (!checkApiKey()) { alert('APIキーを設定してください'); return; }
  addToGenerationQueue(sceneIndex);
}

// キューに追加
function addToGenerationQueue(sceneIndex) {
  // 重複チェック
  if (generationQueue.some(t => t.sceneIndex === sceneIndex)) return;

  // 現在の設定をスナップショットとして保存
  const task = {
    sceneIndex,
    numImages: parseInt(numImagesSelect.value),
    aspectRatio: aspectRatioSelect.value,
    resolution: resolutionSelect.value,
    customPrompt: customPromptInput.value.trim(),
    addedAt: Date.now()
  };

  generationQueue.push(task);

  // ボタンを待機中に変更
  const btn = document.getElementById(`createBtn_${sceneIndex}`);
  if (btn) {
    btn.textContent = '待機を中止';
    btn.classList.remove('btn-primary', 'btn-danger');
    btn.classList.add('btn-secondary'); // 待機中（グレー）
  }

  // キュー処理開始
  if (!isQueueProcessing) {
    processGenerationQueue();
  }
}

// キュー処理ループ
async function processGenerationQueue() {
  if (generationQueue.length === 0) {
    isQueueProcessing = false;

    // 一括生成モードの終了判定
    if (isBulkGenerating) {
      isBulkGenerating = false;
      bulkGenerateBtn.textContent = '一括生成';
      bulkGenerateBtn.classList.remove('btn-danger');
      bulkGenerateBtn.classList.add('btn-success');

      registerScenesBtn.disabled = false;
      bulkSaveBtn.disabled = false;
      bulkDeleteBtn.disabled = false;
      hideStatus();
    }
    return;
  }

  // 他の処理（キュー外など）が動いている場合は少し待つ
  if (isProcessing) {
    setTimeout(processGenerationQueue, 1000);
    return;
  }

  isQueueProcessing = true;
  const task = generationQueue.shift();

  // 実行開始
  isProcessing = true;
  currentProcessingSceneId = task.sceneIndex;
  abortCurrentSceneGeneration = false;

  const btn = document.getElementById(`createBtn_${task.sceneIndex}`);
  if (btn) {
    btn.textContent = '中止';
    btn.classList.remove('btn-secondary');
    btn.classList.add('btn-danger');
  }

  try {
    await generateSceneImagesCore(task);
  } catch (e) {
    console.error(e);
    console.error(`シーン${task.sceneIndex + 1}のエラー: ${e.message}`);
    showStatus(`シーン${task.sceneIndex + 1}でエラーが発生しました`, false);
    await new Promise(r => setTimeout(r, 2000));
  } finally {
    isProcessing = false;
    currentProcessingSceneId = -1;
    abortCurrentSceneGeneration = false;

    // ボタン復帰
    const btnAfter = document.getElementById(`createBtn_${task.sceneIndex}`);
    const scene = scenes[task.sceneIndex];
    if (btnAfter && scene) {
      btnAfter.textContent = `${scene.title}を作成`;
      btnAfter.classList.remove('btn-danger');
      btnAfter.classList.add('btn-primary');
      btnAfter.disabled = false;
    }

    // 次へ
    setTimeout(processGenerationQueue, 100);
  }
}

// 生成コアロジック
async function generateSceneImagesCore(task) {
  const scene = scenes[task.sceneIndex];
  if (!scene) return;

  const { numImages, aspectRatio, resolution, customPrompt } = task;

  // 参照画像収集
  const referenceImages = [];
  charImages.forEach(img => referenceImages.push({ dataUrl: img.dataUrl }));
  scenes.forEach(s => {
    s.images.forEach(img => {
      if (img && img.markers && img.markers.green) referenceImages.push({ dataUrl: img.dataUrl });
    });
  });

  // プロンプト
  let fullPrompt = PROMPT_5_SCENE_CREATE + '\n\n';
  fullPrompt += `---\n漫画のストーリーの下書き:\n${scene.content}\n\n`;
  fullPrompt += `画像設定:\n- アスペクト比: ${aspectRatio}\n- 解像度: ${resolution}\n`;
  if (customPrompt) fullPrompt += `\n追加指示:\n${customPrompt}\n`;

  if (!scene.images) scene.images = [];

  for (let i = 0; i < numImages; i++) {
    // 一括生成の中断チェック
    if (isBulkGenerating && abortBulkGeneration) {
      break;
    }

    if (abortCurrentSceneGeneration) {
      showStatus(`${scene.title} の生成を中止しました`, false);
      break;
    }

    showStatus(`${scene.title} - 画像 ${i + 1}/${numImages} を生成中...`);
    const response = await callNanobanana(fullPrompt, referenceImages);
    const images = extractImagesFromResponse(response);

    if (images.length > 0) {
      scene.images.push({ dataUrl: images[0], markers: { green: false, red: false } });
      saveScenes();
      const imagesGrid = document.getElementById(`sceneImages_${task.sceneIndex}`);
      if (imagesGrid) renderSceneImages(imagesGrid, task.sceneIndex);
    }
  }

  saveScenes();
  hideStatus();
}

// ===== 一括生成 (キューイング版) =====
bulkGenerateBtn.addEventListener('click', () => {
  // 一括生成モードで実行中（または待機中）の場合 -> 中止アクション
  if (isBulkGenerating) {
    if (confirm('一括生成を中止しますか？\n（待機中のタスクは全てキャンセルされます）')) {
      // 待機中タスクを全て削除
      generationQueue = [];

      // 現在実行中のタスクがあれば中断
      if (isProcessing) {
        abortCurrentSceneGeneration = true;
      }

      abortBulkGeneration = true;

      // UIリセット
      setTimeout(() => {
        isBulkGenerating = false;
        bulkGenerateBtn.textContent = '一括生成';
        bulkGenerateBtn.classList.remove('btn-danger');
        bulkGenerateBtn.classList.add('btn-success');
        registerScenesBtn.disabled = false;
        bulkSaveBtn.disabled = false;
        bulkDeleteBtn.disabled = false;

        // ボタンリセット
        scenes.forEach((_, idx) => {
          if (currentProcessingSceneId !== idx) {
            const btn = document.getElementById(`createBtn_${idx}`);
            const s = scenes[idx];
            if (btn) {
              btn.textContent = `${s.title}を作成`;
              btn.classList.remove('btn-secondary');
              btn.classList.add('btn-primary');
            }
          }
        });
      }, 500);
    }
    return;
  }

  if (scenes.length === 0) { alert('生成するシーンがありません'); return; }

  isBulkGenerating = true;
  abortBulkGeneration = false;
  bulkGenerateBtn.textContent = '一括生成中止';
  bulkGenerateBtn.classList.remove('btn-success');
  bulkGenerateBtn.classList.add('btn-danger');

  registerScenesBtn.disabled = true;
  bulkSaveBtn.disabled = true;
  bulkDeleteBtn.disabled = true;

  // 全シーンをキューに追加
  scenes.forEach((_, i) => {
    addToGenerationQueue(i);
  });
});



// ===== 一括保存（赤マーカーの画像を出力） =====
// ===== 一括保存（ZIP） =====
bulkSaveBtn.addEventListener('click', async () => {
  // 画像があるかチェック
  const hasImages = scenes.some(s => s.images && s.images.length > 0);
  if (!hasImages) {
    alert('保存する画像がありません。');
    return;
  }

  if (typeof JSZip === 'undefined') {
    alert('JSZipライブラリが読み込まれていません。ページを更新してください。');
    return;
  }

  const zip = new JSZip();
  let imageCount = 0;

  // 全シーンを走査して画像を追加
  // 全シーンを走査して画像を追加
  scenes.forEach(scene => {
    if (scene.images && scene.images.length > 0) {
      scene.images.forEach((img, idx) => {
        // 赤マーカー（出力対象）が付いている場合のみ保存
        if (img.markers && img.markers.red) {
          // Base64ヘッダー ("data:image/png;base64,") を除去
          // img.dataUrl は "data:image/png;base64,..." の形式
          const base64Data = img.dataUrl.split(',')[1];
          if (base64Data) {
            // ファイル名に使えない文字を置換
            const safeTitle = scene.title.replace(/[\\/:*?"<>|]/g, "_");
            // シーン1_1.png のような形式
            const filename = `${safeTitle}_${idx + 1}.png`;
            zip.file(filename, base64Data, { base64: true });
            imageCount++;
          }
        }
      });
    }
  });

  if (imageCount === 0) {
    alert('保存対象の画像がありません。画像の「〇」をクリックして赤くしてください。');
    return;
  }

  // ZIP生成・ダウンロード
  try {
    showStatus('ZIPファイルを作成中...', true);
    const content = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(content);

    const link = document.createElement('a');
    link.href = url;
    const timestamp = getTimestamp();
    link.download = `scriptoon_images_${timestamp}.zip`;
    document.body.appendChild(link);
    link.click();

    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showStatus('画像をZIPで保存しました', false);
    setTimeout(hideStatus, 3000);
  } catch (e) {
    console.error('ZIP生成エラー:', e);
    alert('ZIPファイルの生成に失敗しました。');
    hideStatus();
  }
});

function getTimestamp() {
  const now = new Date();
  return now.getFullYear() +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0') + '_' +
    String(now.getHours()).padStart(2, '0') +
    String(now.getMinutes()).padStart(2, '0');
}

// ===== 一括削除 =====
bulkDeleteBtn.addEventListener('click', () => {
  // データがあるか確認
  const hasImages = scenes.some(s => s.images && s.images.length > 0);
  if (!hasImages) {
    alert('削除する画像がありません');
    return;
  }

  if (!confirm('全てのシーンの画像を削除しますか？\n（シーンテキスト自体は削除されません）')) {
    return;
  }

  scenes.forEach(scene => {
    scene.images = [];
  });

  saveScenes();
  renderScenes();
  alert('全ての画像を削除しました');
});

// ===== ドラッグ＆ドロップ機能 =====
function setupDragAndDrop(element, sceneIndex) {
  // ドラッグオーバー時
  element.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    element.classList.add('drag-over');
    // 視覚的フィードバック（JSでスタイル適用）
    element.style.backgroundColor = '#e0f7fa';
    element.style.border = '2px dashed #00acc1';
    e.dataTransfer.dropEffect = 'copy';
  });

  // ドラッグリーブ時
  element.addEventListener('dragleave', (e) => {
    e.preventDefault();
    e.stopPropagation();
    element.classList.remove('drag-over');
    element.style.backgroundColor = '';
    element.style.border = '';
  });

  // ドロップ時
  element.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    element.classList.remove('drag-over');
    element.style.backgroundColor = '';
    element.style.border = '';

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleDroppedFiles(files, sceneIndex);
    }
  });
}

// ドロップされたファイルを処理
async function handleDroppedFiles(files, sceneIndex) {
  const scene = scenes[sceneIndex];
  if (!scene) return;
  if (!scene.images) scene.images = [];

  let addedCount = 0;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (!file.type.startsWith('image/')) continue; // 画像以外はスキップ

    try {
      const dataUrl = await readFileAsDataURL(file);
      scene.images.push({
        dataUrl: dataUrl,
        markers: { green: false, red: false }
      });
      addedCount++;
    } catch (err) {
      console.error('画像読み込みエラー:', err);
    }
  }

  if (addedCount > 0) {
    saveScenes();
    // 画像エリアのみ更新
    const imagesGrid = document.getElementById(`sceneImages_${sceneIndex}`);
    if (imagesGrid) {
      renderSceneImages(imagesGrid, sceneIndex);
    }
    showStatus(`${addedCount}枚の画像を追加しました`, false);
    setTimeout(hideStatus, 2000);
  } else {
    alert('画像ファイルが見つかりませんでした。');
  }
}

// ファイル読み込みヘルパー
function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = (e) => reject(e);
    reader.readAsDataURL(file);
  });
}
