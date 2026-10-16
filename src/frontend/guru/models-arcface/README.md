# Model ArcFace ONNX — Panduan Download

Folder ini harus berisi dua file model ONNX untuk menjalankan
pipeline Computer Vision ArcFace di browser (via ONNX Runtime Web).

## File yang Dibutuhkan

```
models-arcface/
├── scrfd_2.5g_bnkps.onnx     (~2.5 MB)  — Face Detector (SCRFD)
└── arcface_r50.onnx           (~100 MB)  — Face Recognizer (ArcFace R50)
```

---

## Cara Download

### Opsi 1 — HuggingFace (Rekomendasi, paling mudah)

Model sudah dikemas dalam format ONNX siap pakai:

```
https://huggingface.co/okojoalpha/insightface-models/tree/main
```

Download file:
- `scrfd_2.5g_bnkps.onnx`
- `arcface_r50.onnx`

Letakkan keduanya langsung di folder `models-arcface/`.

### Opsi 2 — InsightFace Official (GitHub)

**SCRFD (Face Detector):**
```
https://github.com/deepinsight/insightface/tree/master/detection/scrfd
```
Pilih: `scrfd_2.5g_bnkps` (2.5G = 2.5 GFlops, ringan untuk browser)

**ArcFace (Face Recognizer):**
```
https://github.com/deepinsight/insightface/tree/master/recognition/arcface_torch
```
Pilih: `r50` (ResNet-50 backbone, keseimbangan akurasi-kecepatan)
Export ke ONNX: `python -m torch.onnx ...` (lihat docs repo)

### Opsi 3 — Menggunakan script Python (jika ada Python)

```bash
pip install insightface onnx onnxruntime
python -c "
import insightface
from insightface.app import FaceAnalysis
app = FaceAnalysis(providers=['CPUExecutionProvider'])
app.prepare(ctx_id=0, det_size=(640, 640))
# Model akan otomatis didownload ke ~/.insightface/
# Copy scrfd_10g_bnkps.onnx dan buffalo_l/w600k_r50.onnx ke folder ini
"
```

---

## Spesifikasi Model

| Model | File | Ukuran | Input | Output |
|---|---|---|---|---|
| SCRFD 2.5G | `scrfd_2.5g_bnkps.onnx` | ~2.5 MB | 640×640×3 | boxes + kps |
| ArcFace R50 | `arcface_r50.onnx` | ~100 MB | 112×112×3 | 512D embedding |

## Pipeline

```
Video Frame
    │
    ▼ SCRFD (Face Detection)
  Bounding Box + 5 Landmarks (mata×2, hidung, bibir×2)
    │
    ▼ Face Alignment (Affine Transform ke 112×112)
  Face Crop 112×112 RGB
    │
    ▼ ArcFace R50 Inference
  512D Embedding (L2-normalized)
    │
    ▼ Cosine Similarity vs stored embedding
  score ≥ 0.40 → COCOK ✅
```

## Threshold

ArcFace menghasilkan embedding 512 dimensi yang sudah L2-normalized.
Threshold cosine similarity yang digunakan:

- **0.40** — default (seimbang FAR/FRR untuk penggunaan normal)
- **0.35** — lebih longgar (jika banyak false reject di kondisi gelap)
- **0.45** — lebih ketat (keamanan lebih tinggi)

Atur di `backend/src/handlers/guru/absen.php`, konstanta `THRESHOLD_WAJAH`.

## Catatan Performa

- Load pertama: ~3–8 detik (tergantung jaringan & hardware)
- Inference per frame: ~50–200ms (WebGL GPU) / ~300–800ms (WASM CPU)
- Ukuran total transfer: ~102 MB (di-cache browser setelah pertama kali)

## Keamanan

Model berjalan **sepenuhnya di browser** (client-side inference via ONNX Runtime Web).
Data wajah (raw video) tidak pernah dikirim ke server —
hanya embedding 512 angka float yang dikirim via POST `/api/guru/absen`.
