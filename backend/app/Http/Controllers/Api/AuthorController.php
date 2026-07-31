<?php

namespace App\Http\Controllers\Api;

use App\Exceptions\DomainException;
use App\Http\Controllers\Controller;
use App\Http\Requests\UploadImageRequest;
use App\Models\Author;
use App\Services\System\AuditLogService;
use App\Services\System\SupabaseStorageService;
use App\Support\AuditAction;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * DFD Level-0 — "Author Management".
 * DFD Level-1 — the "List of Authors" data store.
 */
class AuthorController extends Controller
{
    public function __construct(
        private AuditLogService $audit,
        private SupabaseStorageService $storage,
    ) {}

    /** GET /api/authors */
    public function index(Request $request): JsonResponse
    {
        $query = Author::withCount('books')->search($request->query('q'));

        // The book form needs the whole list; the management screen paginates.
        if ($request->boolean('all')) {
            return $this->ok(
                $query->orderBy('name')->get()->map(fn (Author $a) => $this->present($a))
            );
        }

        $page = $query->orderBy('name')->paginate(min(100, (int) $request->query('per_page', 25)));

        return $this->paginated(
            $page,
            $page->getCollection()->map(fn (Author $a) => $this->present($a))->all()
        );
    }

    /** GET /api/authors/{author} */
    public function show(Author $author): JsonResponse
    {
        $author->loadCount('books');
        $author->load(['books' => fn ($q) => $q->with('category')->orderBy('title')]);

        return $this->ok([
            'author' => $this->present($author),
            'books' => $author->books->map(fn ($book) => [
                'book_id' => $book->book_id,
                'title' => $book->title,
                'isbn' => $book->isbn,
                'category' => $book->category?->name,
                'available_copies' => $book->available_copies,
                'total_copies' => $book->total_copies,
            ]),
        ]);
    }

    /** POST /api/authors */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:150', 'unique:authors,name'],
            'nationality' => ['nullable', 'string', 'max:80'],
            'biography' => ['nullable', 'string', 'max:2000'],
        ], [
            'name.unique' => 'An author with this name already exists.',
        ]);

        $author = Author::create($data);

        $this->audit->record(
            $request->user(),
            AuditAction::AUTHOR_CREATED,
            'author',
            $author->author_id,
            "Created author \"{$author->name}\""
        );

        return $this->created($this->present($author->loadCount('books')), 'Author created.');
    }

    /** PUT /api/authors/{author} */
    public function update(Request $request, Author $author): JsonResponse
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:150', Rule::unique('authors', 'name')->ignore($author->author_id, 'author_id')],
            'nationality' => ['nullable', 'string', 'max:80'],
            'biography' => ['nullable', 'string', 'max:2000'],
        ]);

        $author->update($data);

        $this->audit->record(
            $request->user(),
            AuditAction::AUTHOR_UPDATED,
            'author',
            $author->author_id,
            "Updated author \"{$author->name}\""
        );

        return $this->ok($this->present($author->fresh()->loadCount('books')), 'Author updated.');
    }

    /** DELETE /api/authors/{author} */
    public function destroy(Request $request, Author $author): JsonResponse
    {
        $bookCount = $author->books()->count();

        if ($bookCount > 0) {
            throw new DomainException(
                "Cannot delete \"{$author->name}\" — {$bookCount} book(s) are attributed to this author. ".
                'Reassign those books first.',
                ['books_count' => $bookCount]
            );
        }

        $name = $author->name;
        $id = $author->author_id;

        $author->delete();

        $this->audit->record($request->user(), AuditAction::AUTHOR_DELETED, 'author', $id, "Deleted author \"{$name}\"");

        return $this->ok(null, 'Author deleted.');
    }

    /** POST /api/authors/{author}/photo — multipart image upload */
    public function uploadPhoto(UploadImageRequest $request, Author $author): JsonResponse
    {
        $previous = $author->photo;
        $url = $this->storage->upload($request->file('image'), 'authors');

        $author->update(['photo' => $url]);
        $this->storage->delete($previous);

        $this->audit->record(
            $request->user(),
            AuditAction::AUTHOR_UPDATED,
            'author',
            $author->author_id,
            "Updated photo for \"{$author->name}\""
        );

        return $this->ok($this->present($author->fresh()->loadCount('books')), 'Photo updated.');
    }

    private function present(Author $author): array
    {
        return [
            'author_id' => $author->author_id,
            'name' => $author->name,
            'nationality' => $author->nationality,
            'biography' => $author->biography,
            'photo' => $author->photo,
            'books_count' => $author->books_count ?? 0,
        ];
    }
}
