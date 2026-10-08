# SAT Question Bank

Convert your SAT question-bank PDF into an answerable practice app with right/wrong tracking, sortable by skill and domain.

## Download

Requires Node.js 18+ and Python 3.9+ (with `pymupdf`) on your machine.

```bash
git clone https://github.com/TheDosaMaster/s.git
cd s
npm install
pip install pymupdf
```

## Use

Start the app:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

1. Go to the **Import** tab and upload your question-bank PDF (or click **Load the sample bank** to try an example).
2. Go to the **Practice** tab, filter by domain/skill/status, and start a session. Answer with a click or the **A–D** keys; press **Enter** for the next question.
3. Go to the **Bank** tab to browse all questions, filter, sort by skill/domain, and review answers and explanations.

To regenerate the JSON converter output from a PDF manually:

```bash
python3 pdf_to_json.py <input.pdf> <output.json>
```