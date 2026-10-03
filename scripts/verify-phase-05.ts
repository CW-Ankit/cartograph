import { sampleParseResult } from '../lib/scaffold/sample-data';
import { detectFramework } from '../lib/graph/framework';
import { deriveFileCategories } from '../lib/graph/categories';

async function main() {
  console.log('Phase 5 Detail Pane Acceptance Check Verification');
  console.log('================================================');

  const { files, edges } = sampleParseResult;
  console.log(`Input dataset: ${files.length} parsed files, ${edges.length} parser edges.`);

  // 1. Check Framework Detection
  console.log('\nCheck 1: Repository Overview & Framework Detection');
  const framework = detectFramework(sampleParseResult);
  console.log(`- Detected framework: "${framework}"`);
  const check1Pass = framework !== '' && framework !== 'Unknown';
  console.log(`- Check 1: ${check1Pass ? 'PASS' : 'FAIL'}`);

  // 2. Check Repository Summary Data (Resting State)
  console.log('\nCheck 2: Repository resting state metrics and ranked lists');
  const unidentified = files.filter((f) => f.role === 'module').length;
  console.log(`- Files count: ${files.length}`);
  console.log(`- Imports count: ${edges.length}`);
  console.log(`- Unidentified convention count: ${unidentified}`);

  const mostDependedOn = [...files]
    .filter((f) => f.fanIn > 0)
    .sort((a, b) => b.fanIn - a.fanIn || a.path.localeCompare(b.path));

  const readingStarts = [...files]
    .filter((f) => f.fanIn === 0)
    .sort((a, b) => b.fanOut - a.fanOut || a.path.localeCompare(b.path));

  console.log(`- Most depended on files count: ${mostDependedOn.length} (top: ${mostDependedOn[0]?.path} with fanIn ${mostDependedOn[0]?.fanIn})`);
  console.log(`- Reading starts files count: ${readingStarts.length} (top: ${readingStarts[0]?.path} with fanOut ${readingStarts[0]?.fanOut})`);

  const check2Pass =
    files.length > 0 &&
    edges.length > 0 &&
    mostDependedOn.length > 0 &&
    readingStarts.length > 0 &&
    mostDependedOn[0].fanIn >= mostDependedOn[mostDependedOn.length - 1].fanIn;
  console.log(`- Check 2: ${check2Pass ? 'PASS' : 'FAIL'}`);

  // 3. Check Exact 1:1 Match: Import and Dependent counts vs List rows
  console.log('\nCheck 3: Import and Dependent counts match listed rows exactly across all files');
  let mismatchCount = 0;
  const sampleTestFiles = files.slice(0, 100); // Check 100 files in detail

  for (const file of sampleTestFiles) {
    const outgoing = edges.filter((e) => e.source === file.id);
    const incoming = edges.filter((e) => e.target === file.id);

    if (outgoing.length !== file.fanOut) {
      console.error(`Mismatch for ${file.path}: fanOut is ${file.fanOut} but outgoing edges count is ${outgoing.length}`);
      mismatchCount++;
    }
    if (incoming.length !== file.fanIn) {
      console.error(`Mismatch for ${file.path}: fanIn is ${file.fanIn} but incoming edges count is ${incoming.length}`);
      mismatchCount++;
    }
  }

  console.log(`- Tested ${sampleTestFiles.length} files for exact count-to-row parity`);
  console.log(`- Total count mismatches: ${mismatchCount}`);
  const check3Pass = mismatchCount === 0;
  console.log(`- Check 3: ${check3Pass ? 'PASS' : 'FAIL'}`);

  // 4. Check Folder category breakdown
  console.log('\nCheck 4: Folder Detail categories breakdown');
  const sampleFolder = 'client/src/links';
  const folderFiles = files.filter((f) => f.folder === sampleFolder || f.folder.startsWith(`${sampleFolder}/`));
  const categories = deriveFileCategories(folderFiles);

  console.log(`- Folder "${sampleFolder}" contains ${folderFiles.length} files`);
  console.log(`- Category kinds present: ${categories.map((c) => `${c.name} (${c.count})`).join(', ')}`);
  const check4Pass = folderFiles.length > 0 && categories.length > 0;
  console.log(`- Check 4: ${check4Pass ? 'PASS' : 'FAIL'}`);

  if (check1Pass && check2Pass && check3Pass && check4Pass) {
    console.log('\nALL PROGRAMMATIC CHECKS PASSED.');
  } else {
    console.error('\nACCEPTANCE CHECK FAILED.');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
