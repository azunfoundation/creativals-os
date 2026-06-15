<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\ProjectDocument;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ProjectDocumentController extends Controller
{
    /**
     * List all documents for a project.
     * 
     * GET /api/v1/projects/{project}/documents
     */
    public function index(Project $project): JsonResponse
    {
        $documents = $project->documents()->with('uploader')->orderBy('created_at', 'desc')->get();

        return response()->json([
            'data' => $documents
        ]);
    }

    /**
     * Store a new project document record.
     * 
     * POST /api/v1/projects/{project}/documents
     */
    public function store(Request $request, Project $project): JsonResponse
    {
        $validated = $request->validate([
            'filename' => ['required', 'string', 'max:255'],
            'file_path' => ['required', 'string', 'max:500'],
            'file_size' => ['nullable', 'integer'],
            'mime_type' => ['nullable', 'string', 'max:100'],
        ]);

        $validated['uploaded_by'] = $request->user()->id;

        $document = $project->documents()->create($validated);

        return response()->json([
            'message' => 'Document saved successfully.',
            'data' => $document->load('uploader')
        ], 201);
    }

    /**
     * Delete a project document and remove its file from disk.
     * 
     * DELETE /api/v1/projects/{project}/documents/{document}
     */
    public function destroy(Project $project, ProjectDocument $document): JsonResponse
    {
        if ($document->project_id !== $project->id) {
            return response()->json(['message' => 'Document does not belong to this project.'], 400);
        }

        // Delete from storage disk
        if ($document->file_path && Storage::disk('public')->exists($document->file_path)) {
            Storage::disk('public')->delete($document->file_path);
        }

        $document->delete();

        return response()->json([
            'message' => 'Document deleted successfully.'
        ]);
    }
}
