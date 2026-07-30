# Diligent  School - Student Report Card System (ደሊጀንት ትምህርት ቤት የተማሪ ውጤት መግለጫ)

ይህ መተግበሪያ የኪብር መካከለኛ ደረጃ ትምህርት ቤት የተማሪዎችን ውጤት ለመመዝገብ፣ ለመከታተል እና ማራኪ የሆኑ የተማሪ ውጤት መግለጫ ካርዶችን (Report Cards) በPDF ለማመንጨት የተዘጋጀ ሲስተም ነው።

---

## 💻 1. ያለ ኢንተርኔት በኮምፒውተርዎ ላይ ለመጫንና ለመጠቀም (How to Run Offline on Desktop)

ይህ መተግበሪያ አንዴ ከተጫነ በኋላ **ያለ ምንም የኢንተርኔት ግንኙነት (Offline)** በኮምፒውተርዎ ላይ ሙሉ በሙሉ ይሰራል። ለመጫን የሚከተሉትን ደረጃዎች ይከተሉ፡

### ቅድመ-ሁኔታዎች (Prerequisites)
ኮምፒውተርዎ ላይ **Node.js** መጫን አለበት። ከሌለዎት ከ [nodejs.org](https://nodejs.org/) በነጻ አውርደው ይጫኑት።

### የመጫኛ ቅደም-ተከተል (Setup Steps)
1. መተግበሪያውን በ **ZIP** ያውርዱ እና ዚፑን ይክፈቱት (Extract)።
2. የኮምፒውተርዎን **Terminal** ወይም **Command Prompt (CMD)** ይክፈቱ።
3. ወደ መተግበሪያው ፎልደር በ `cd` ይግቡ።
4. **ለአንድ ጊዜ ብቻ (ኢንተርኔት ሲኖር)** አስፈላጊ የሆኑ ፋይሎችን ለመጫን ይህንን ትዕዛዝ ያሂዱ፡
   ```bash
   npm install
   ```
5. አሁን መተግበሪያውን ለመክፈትና ለመጠቀም (ኢንተርኔት ባይኖርም ይሰራል) ይህንን ያሂዱ፡
   ```bash
   npm run dev
   ```
6. ሲስተሙ የሚሰጥዎትን ሊንክ (ብዙውን ጊዜ `http://localhost:3000` ወይም `http://localhost:5173`) በኮምፒውተርዎ ብሮውዘር (Chrome/Edge) ላይ በመክፈት መጠቀም ይችላሉ!

---

## 🚀 2. በነጻ ወደ Vercel ወይም GitHub በመጫን በሊንክ ለመጠቀም (How to Deploy to Vercel/GitHub)

መተግበሪያውን በሊንክ ለሌሎች ሰዎች ለማጋራት በቀላሉ በ **Vercel** ላይ መጫን ይችላሉ።

### በ Vercel ላይ ለመጫን (Deploy to Vercel)
1. ወደ [vercel.com](https://vercel.com/) ይሂዱና በነጻ አካውንት ይክፈቱ (በGitHub አካውንትዎ መግባት ይችላሉ)።
2. **Add New Project** የሚለውን ይጫኑ።
3. የ GitHub ኮድዎን ያገናኙ (Import) ወይም የኮዱን ፎልደር ይምረጡ።
4. **Deploy** የሚለውን ቁልፍ ይጫኑ። Vercel በራሱ ጊዜ ሰርቶ በነጻ የሚከፈት አዲስ የኢንተርኔት ሊንክ ይሰጥዎታል።

---

## 🛠️ የቴክኖሎጂ ዝርዝር (Tech Stack)
- **React 18** & **Vite** (ለፈጣን ስራ)
- **Tailwind CSS** (ለማራኪ ገጽታ)
- **Lucide Icons** (ለስዕላዊ መግለጫዎች)
- **HTML5 Canvas / jspdf** (ለPDF ማውረጃ)

---

Developed and polished with ❤️ inside Google AI Studio.
