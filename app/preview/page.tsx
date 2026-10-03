import React from 'react';
import { Shell } from '@/components/shell';
import { sampleParseResult } from '@/lib/scaffold/sample-data';

export const metadata = {
  title: 'Map Canvas Preview — Cartograph',
  description: 'Scaffolding preview rendering parsed sample repository dependency map.',
};

export default function PreviewPage() {
  return (
    <Shell
      view="map"
      parseResult={sampleParseResult}
      isScaffoldPreview={true}
    />
  );
}
