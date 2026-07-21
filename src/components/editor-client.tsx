'use client';

import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useDocumentSync } from '@/hooks/useDocumentSync';
import { useAIAssistant } from '@/hooks/useAIAssistant';
import { useSnapshots } from '@/hooks/useSnapshots';
import { EditorHeader } from './editor/EditorHeader';
import { EditorBlock } from './editor/EditorBlock';
import { ShareModal } from './modals/ShareModal';
import { SnapshotModal } from './modals/SnapshotModal';

interface EditorClientProps {
  documentId: string;
  initialTitle: string;
  role: string;
  currentUserEmail: string;
  allUsers: any[];
}

export default function EditorClient({ documentId, initialTitle, role, currentUserEmail, allUsers }: EditorClientProps) {
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  const {
    blocks,
    setBlocks,
    status,
    currentRole,
    isInitialLoading,
    title,
    handleTitleChange,
    updateBlockContent,
    handleKeyDown,
    syncManagerRef,
    reloadBlocks
  } = useDocumentSync({
    documentId,
    initialTitle,
    initialRole: role,
    currentUserEmail
  });

  const {
    aiMenuBlockId,
    setAiMenuBlockId,
    aiLoadingBlockId,
    handleAIAssist
  } = useAIAssistant({
    documentId,
    blocks,
    setBlocks,
    syncManagerRef,
    currentRole
  });

  const {
    isSnapshotModalOpen,
    setIsSnapshotModalOpen,
    snapshots,
    isCreatingSnapshot,
    loadSnapshots,
    createSnapshot,
    restoreSnapshot
  } = useSnapshots({
    documentId,
    blocks,
    currentRole,
    reloadBlocks,
    syncManagerRef
  });

  return (
    <div className="flex-1 flex flex-col items-center py-6 px-4 md:px-8 w-full relative min-h-screen">
      <EditorHeader 
        title={title}
        handleTitleChange={handleTitleChange}
        status={status}
        currentRole={currentRole}
        currentUserEmail={currentUserEmail}
        setIsShareModalOpen={setIsShareModalOpen}
        loadSnapshots={loadSnapshots}
      />

      <div className="w-full max-w-3xl space-y-3 relative z-10">
        {isInitialLoading ? (
          <div className="flex justify-center items-center py-12 text-muted-foreground">
            <Loader2 size={24} className="animate-spin mr-2" /> Loading document...
          </div>
        ) : null}
        
        {!isInitialLoading && blocks.map((block, i) => (
          <EditorBlock
            key={block.id}
            block={block}
            index={i}
            currentRole={currentRole}
            aiMenuBlockId={aiMenuBlockId}
            aiLoadingBlockId={aiLoadingBlockId}
            setAiMenuBlockId={setAiMenuBlockId}
            handleAIAssist={handleAIAssist}
            updateBlockContent={updateBlockContent}
            handleKeyDown={handleKeyDown}
          />
        ))}
        
        {!isInitialLoading && blocks.length === 0 && (
          <div className="text-center py-12 text-muted-foreground italic glass-panel rounded-xl">
            This document is empty.
          </div>
        )}
      </div>

      {isShareModalOpen && (
        <ShareModal 
          documentId={documentId}
          allUsers={allUsers}
          currentUserEmail={currentUserEmail}
          setIsShareModalOpen={setIsShareModalOpen}
        />
      )}

      {isSnapshotModalOpen && (
        <SnapshotModal 
          currentRole={currentRole}
          isCreatingSnapshot={isCreatingSnapshot}
          snapshots={snapshots}
          setIsSnapshotModalOpen={setIsSnapshotModalOpen}
          createSnapshot={createSnapshot}
          restoreSnapshot={restoreSnapshot}
        />
      )}
    </div>
  );
}
