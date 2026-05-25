import { useState, useEffect } from 'react';
import Select from 'react-select';
import { useTags, useNoteTags } from '../../hooks/useTags';

interface TagsInputProps {
  noteId: string;
}

export function TagsInput({ noteId }: TagsInputProps) {
  const { tags: allTags } = useTags();
  const { tags: noteTags, loading, addTag, removeTag } = useNoteTags(noteId);

  const options = allTags.map(tag => ({
    value: tag.id,
    label: tag.name,
  }));

  const value = noteTags.map(tag => ({
    value: tag.id,
    label: tag.name,
  }));

  const handleChange = async (selectedOptions: any) => {
    const selectedIds = selectedOptions ? selectedOptions.map((opt: any) => opt.value) : [];
    const currentIds = noteTags.map(tag => tag.id);

    // Find added tags
    const addedIds = selectedIds.filter((id: string) => !currentIds.includes(id));
    for (const id of addedIds) {
      const tag = allTags.find(t => t.id === id);
      if (tag) {
        await addTag(tag.name);
      }
    }

    // Find removed tags
    const removedIds = currentIds.filter(id => !selectedIds.includes(id));
    for (const id of removedIds) {
      await removeTag(id);
    }
  };

  if (loading) {
    return (
      <div className="tags-input p-4 border-b border-border">
        <div className="text-secondary text-sm">Loading tags...</div>
      </div>
    );
  }

  return (
    <div className="tags-input p-4 border-b border-border">
      <Select
        isMulti
        value={value}
        options={options}
        onChange={handleChange}
        placeholder="Add tags..."
        className="react-select-container"
        classNamePrefix="react-select"
        styles={{
          control: (base) => ({
            ...base,
            backgroundColor: 'var(--color-background)',
            borderColor: 'var(--color-border)',
            color: 'var(--color-foreground)',
          }),
          menu: (base) => ({
            ...base,
            backgroundColor: 'var(--color-background)',
            borderColor: 'var(--color-border)',
          }),
          option: (base, state) => ({
            ...base,
            backgroundColor: state.isFocused ? 'var(--color-accent)' : 'var(--color-background)',
            color: 'var(--color-foreground)',
          }),
          multiValue: (base) => ({
            ...base,
            backgroundColor: 'var(--color-accent)',
          }),
          multiValueLabel: (base) => ({
            ...base,
            color: 'var(--color-foreground)',
          }),
          multiValueRemove: (base) => ({
            ...base,
            color: 'var(--color-foreground)',
            ':hover': {
              backgroundColor: 'var(--color-destructive)',
              color: 'var(--color-destructive-foreground)',
            },
          }),
        }}
      />
    </div>
  );
}
