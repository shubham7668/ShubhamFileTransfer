// Connect to Supabase (consider moving to environment variables)
const SUPABASE_URL = "https://jjrhyeturocimlzbuavi.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impqcmh5ZXR1cm9jaW1semJ1YXZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxMzkwOTcsImV4cCI6MjA3MDcxNTA5N30.qq3I8gFu3I8dz0r_igSjbD9xKSmG6QFmYjGSWuBS2Iw";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// DOM Elements
const fileInput = document.getElementById("fileInput");
const dropArea = document.getElementById("drop-area");
const fileList = document.getElementById("fileList");
const emptyState = document.getElementById("emptyState");
const progressContainer = document.getElementById("progressContainer");
const progressBar = document.getElementById("progressBar");
const statusMessage = document.getElementById("statusMessage");

// Load files on page load
loadFiles();

// File selection
fileInput.addEventListener("change", (e) => handleFiles(e.target.files));

// Drag & drop events
dropArea.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropArea.classList.add("dragover");
});

dropArea.addEventListener("dragleave", (e) => {
  e.preventDefault();
  dropArea.classList.remove("dragover");
});

dropArea.addEventListener("drop", (e) => {
  e.preventDefault();
  dropArea.classList.remove("dragover");
  handleFiles(e.dataTransfer.files);
});

// Click to upload (only on the label, not the whole drop area)
document.querySelector('.upload-btn').addEventListener("click", (e) => {
  e.stopPropagation(); // Prevent event bubbling
});

// Show status message
function showStatus(message, type = 'success') {
  statusMessage.textContent = message;
  statusMessage.className = `status-message ${type}`;
  statusMessage.style.display = 'block';

  setTimeout(() => {
    statusMessage.style.display = 'none';
  }, 3000);
}

// Show/hide progress
function showProgress(show = true) {
  progressContainer.style.display = show ? 'block' : 'none';
  if (!show) progressBar.style.width = '0%';
}

// Update progress
function updateProgress(percent) {
  progressBar.style.width = `${percent}%`;
}

// Format file size
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Get file icon
function getFileIcon(fileName) {
  const ext = fileName.split('.').pop().toLowerCase();
  const icons = {
    'pdf': '📄', 'doc': '📝', 'docx': '📝', 'txt': '📄',
    'jpg': '🖼️', 'jpeg': '🖼️', 'png': '🖼️', 'gif': '🖼️', 'svg': '🖼️',
    'mp4': '🎥', 'avi': '🎥', 'mov': '🎥', 'wmv': '🎥',
    'mp3': '🎵', 'wav': '🎵', 'flac': '🎵', 'aac': '🎵',
    'zip': '📦', 'rar': '📦', '7z': '📦', 'tar': '📦',
    'js': '💻', 'html': '💻', 'css': '💻', 'py': '💻', 'java': '💻'
  };
  return icons[ext] || '📄';
}

// Upload files with progress
async function handleFiles(files) {
  if (files.length === 0) return;

  showProgress(true);
  let uploaded = 0;
  const total = files.length;

  for (let file of files) {
    try {
      const filePath = `${Date.now()}_${file.name}`;
      const { error } = await supabaseClient
        .storage
        .from("files")
        .upload(filePath, file);

      if (error) {
        throw error;
      }

      uploaded++;
      updateProgress((uploaded / total) * 100);
    } catch (error) {
      showStatus(`❌ Upload failed: ${error.message}`, 'error');
      showProgress(false);
      return;
    }
  }

  showProgress(false);
  showStatus(`✅ Successfully uploaded ${uploaded} file${uploaded > 1 ? 's' : ''}!`);
  await loadFiles();

  // Reset file input
  fileInput.value = '';
}

// Load and display files
async function loadFiles() {
  try {
    const { data, error } = await supabaseClient
      .storage
      .from("files")
      .list("", {
        limit: 100,
        sortBy: { column: "created_at", order: "desc" }
      });

    if (error) throw error;

    // Filter out placeholder files
    const files = data.filter(file => file.name !== ".emptyFolderPlaceholder");

    // Show/hide empty state
    emptyState.style.display = files.length === 0 ? 'block' : 'none';

    // Clear existing file list
    const existingItems = fileList.querySelectorAll('.file-item');
    existingItems.forEach(item => item.remove());

    // Create file items
    files.forEach(file => {
      const originalName = file.name.replace(/^\d+_/, "");
      const fileUrl = `${SUPABASE_URL}/storage/v1/object/public/files/${file.name}`;
      const fileSize = formatFileSize(file.metadata?.size || 0);
      const fileIcon = getFileIcon(originalName);

      const item = document.createElement("div");
      item.classList.add("file-item");

      const fileInfo = document.createElement("div");
      fileInfo.classList.add("file-info");

      const fileName = document.createElement("div");
      fileName.classList.add("file-name");
      fileName.textContent = `${fileIcon} ${originalName}`;

      const fileMeta = document.createElement("div");
      fileMeta.classList.add("file-meta");
      fileMeta.textContent = `${fileSize} • Uploaded ${new Date(file.created_at).toLocaleDateString()}`;

      fileInfo.append(fileName, fileMeta);

      const actions = document.createElement("div");
      actions.classList.add("file-actions");

      // Download button
      const downloadBtn = document.createElement("button");
      downloadBtn.innerHTML = "⬇️ Download";
      downloadBtn.onclick = () => {
        const link = document.createElement("a");
        link.href = fileUrl;
        link.download = originalName; // Use original name for download
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      };

      // Rename button
      const renameBtn = document.createElement("button");
      renameBtn.innerHTML = "✏️ Rename";
      renameBtn.onclick = () => renameFile(file.name);

      // Delete button
      const deleteBtn = document.createElement("button");
      deleteBtn.classList.add("delete");
      deleteBtn.innerHTML = "🗑️ Delete";
      deleteBtn.onclick = () => deleteFile(file.name, originalName);

      actions.append(downloadBtn, renameBtn, deleteBtn);
      item.append(fileInfo, actions);
      fileList.appendChild(item);
    });

  } catch (error) {
    showStatus(`❌ Failed to load files: ${error.message}`, 'error');
    console.error("Error loading files:", error);
  }
}

// Delete file with confirmation
async function deleteFile(fileName, displayName) {
  if (!confirm(`Are you sure you want to delete "${displayName}"?`)) return;

  try {
    const { error } = await supabaseClient
      .storage
      .from("files")
      .remove([fileName]);

    if (error) throw error;

    showStatus(`🗑️ File "${displayName}" deleted successfully!`);
    await loadFiles();
  } catch (error) {
    showStatus(`❌ Delete failed: ${error.message}`, 'error');
    console.error("Delete error:", error);
  }
}

// Rename file
async function renameFile(oldFileName) {
  const currentName = oldFileName.replace(/^\d+_/, "");
  const newName = prompt("Enter new file name:", currentName);

  if (!newName || newName === currentName) return;

  try {
    // Download file content
    const { data: blob, error: downloadError } = await supabaseClient
      .storage
      .from("files")
      .download(oldFileName);

    if (downloadError) throw downloadError;

    // Upload with new name
    const newPath = `${Date.now()}_${newName}`;
    const { error: uploadError } = await supabaseClient
      .storage
      .from("files")
      .upload(newPath, blob, { upsert: false });

    if (uploadError) throw uploadError;

    // Delete old file
    const { error: deleteError } = await supabaseClient
      .storage
      .from("files")
      .remove([oldFileName]);

    if (deleteError) {
      console.warn("Could not delete old file:", deleteError);
      showStatus(`⚠️ Renamed to "${newName}" but couldn't delete old file`, 'error');
    } else {
      showStatus(`✏️ File renamed to "${newName}" successfully!`);
    }

    await loadFiles();
  } catch (error) {
    showStatus(`❌ Rename failed: ${error.message}`, 'error');
    console.error("Rename error:", error);
  }
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'u') {
    e.preventDefault();
    fileInput.click();
  }
});