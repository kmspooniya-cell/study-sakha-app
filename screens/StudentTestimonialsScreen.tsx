import React from 'react';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigation } from '../lib/navigation';
import { Shell } from '../components/Shell';
import { EmptyState } from '../components/ui';

export default function StudentTestimonialsScreen() {
  const nav = useNavigation<AppNavigation>();

  return (
    <Shell active="StudentTestimonials" title="Student Testimonials" subtitle="Stories from the Study Sakha community">
      <EmptyState
        icon="chatbubbles-outline"
        title="Testimonials are coming soon"
        body="Student stories will appear here when they are available."
        action="Back to Library"
        onAction={() => nav.navigate('Library')}
      />
    </Shell>
  );
}
