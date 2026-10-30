import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { Shell } from '../components/Shell';
import { EmptyState } from '../components/ui';

export default function StudentTestimonialsScreen() {
  const nav = useNavigation<any>();

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
