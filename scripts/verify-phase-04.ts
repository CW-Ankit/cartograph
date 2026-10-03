import { sampleParseResult } from '../lib/scaffold/sample-data';
import { foldRepository } from '../lib/graph/folding';

async function main() {
  console.log('Phase 4 Acceptance Check Verification');
  console.log('=====================================');

  const { files, edges } = sampleParseResult;
  console.log(`Input dataset: ${files.length} parsed files, ${edges.length} parser edges.`);

  const foldingResult = foldRepository(files, edges, 24);
  const { nodes, edges: derivedEdges, threshold } = foldingResult;

  console.log(`\nFolding threshold selected: >= ${threshold} files per merged directory`);
  console.log(`\nCheck 1: Node count`);
  console.log(`- Total nodes: ${nodes.length}`);
  console.log(`- Target: Under roughly two dozen (<= 24 or ~24), ~1 node per 10 files`);
  const ratio = (files.length / nodes.length).toFixed(1);
  console.log(`- File-to-node ratio: 1 node per ${ratio} files`);
  const check1Pass = nodes.length <= 25 && nodes.length >= 10;
  console.log(`- Check 1: ${check1Pass ? 'PASS' : 'FAIL'}`);

  console.log(`\nCheck 2: Every node holds more than one file`);
  let singleFileNodes = 0;
  let minFileCount = Infinity;
  let maxFileCount = -Infinity;

  for (const node of nodes) {
    const count = node.files.length;
    if (count < minFileCount) minFileCount = count;
    if (count > maxFileCount) maxFileCount = count;
    if (count <= 1) singleFileNodes++;
  }

  console.log(`- Minimum files in any node: ${minFileCount}`);
  console.log(`- Maximum files in any node: ${maxFileCount}`);
  console.log(`- Single-file nodes count: ${singleFileNodes}`);
  const check2Pass = singleFileNodes === 0 && minFileCount > 1;
  console.log(`- Check 2: ${check2Pass ? 'PASS' : 'FAIL'}`);

  console.log(`\nCheck 3: Every edge terminates on a node that exists`);
  const existingNodeIds = new Set(nodes.map((n) => n.id));
  let missingSourceCount = 0;
  let missingTargetCount = 0;

  for (const edge of derivedEdges) {
    if (!existingNodeIds.has(edge.sourceNodeId)) {
      missingSourceCount++;
    }
    if (!existingNodeIds.has(edge.targetNodeId)) {
      missingTargetCount++;
    }
  }

  console.log(`- Total derived edges: ${derivedEdges.length}`);
  console.log(`- Missing source nodes: ${missingSourceCount}`);
  console.log(`- Missing target nodes: ${missingTargetCount}`);
  const check3Pass = missingSourceCount === 0 && missingTargetCount === 0;
  console.log(`- Check 3: ${check3Pass ? 'PASS' : 'FAIL'}`);

  console.log(`\nSummary of Active Nodes (${nodes.length}):`);
  for (const node of nodes) {
    console.log(`  - [${node.label}] ${node.path} (${node.files.length} files, fanIn: ${node.fanIn}, fanOut: ${node.fanOut})`);
  }

  if (check1Pass && check2Pass && check3Pass) {
    console.log(`\nALL AUTOMATED ACCEPTANCE CHECKS PASSED.`);
  } else {
    console.error(`\nACCEPTANCE CHECK FAILED.`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
