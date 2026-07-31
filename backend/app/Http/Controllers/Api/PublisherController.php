<?php

namespace App\Http\Controllers\Api;

use App\Exceptions\DomainException;
use App\Http\Controllers\Controller;
use App\Models\Publisher;
use App\Services\System\AuditLogService;
use App\Support\AuditAction;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * DFD Level-0 — "Publisher Management".
 */
class PublisherController extends Controller
{
    public function __construct(private AuditLogService $audit) {}

    /** GET /api/publishers */
    public function index(Request $request): JsonResponse
    {
        $query = Publisher::withCount('books')->search($request->query('q'));

        if ($request->boolean('all')) {
            return $this->ok(
                $query->orderBy('name')->get()->map(fn (Publisher $p) => $this->present($p))
            );
        }

        $page = $query->orderBy('name')->paginate(min(100, (int) $request->query('per_page', 25)));

        return $this->paginated(
            $page,
            $page->getCollection()->map(fn (Publisher $p) => $this->present($p))->all()
        );
    }

    /** GET /api/publishers/{publisher} */
    public function show(Publisher $publisher): JsonResponse
    {
        $publisher->loadCount('books');
        $publisher->load(['books' => fn ($q) => $q->with(['category', 'author'])->orderBy('title')]);

        return $this->ok([
            'publisher' => $this->present($publisher),
            'books' => $publisher->books->map(fn ($book) => [
                'book_id' => $book->book_id,
                'title' => $book->title,
                'isbn' => $book->isbn,
                'author' => $book->author?->name,
                'category' => $book->category?->name,
                'available_copies' => $book->available_copies,
                'total_copies' => $book->total_copies,
            ]),
        ]);
    }

    /** POST /api/publishers */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:150', 'unique:publishers,name'],
            'address' => ['nullable', 'string', 'max:200'],
            'contact_email' => ['nullable', 'email', 'max:120'],
            'contact_phone' => ['nullable', 'string', 'max:30'],
            'website' => ['nullable', 'string', 'max:150'],
        ], [
            'name.unique' => 'A publisher with this name already exists.',
        ]);

        $publisher = Publisher::create($data);

        $this->audit->record(
            $request->user(),
            AuditAction::PUBLISHER_CREATED,
            'publisher',
            $publisher->publisher_id,
            "Created publisher \"{$publisher->name}\""
        );

        return $this->created($this->present($publisher->loadCount('books')), 'Publisher created.');
    }

    /** PUT /api/publishers/{publisher} */
    public function update(Request $request, Publisher $publisher): JsonResponse
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:150', Rule::unique('publishers', 'name')->ignore($publisher->publisher_id, 'publisher_id')],
            'address' => ['nullable', 'string', 'max:200'],
            'contact_email' => ['nullable', 'email', 'max:120'],
            'contact_phone' => ['nullable', 'string', 'max:30'],
            'website' => ['nullable', 'string', 'max:150'],
        ]);

        $publisher->update($data);

        $this->audit->record(
            $request->user(),
            AuditAction::PUBLISHER_UPDATED,
            'publisher',
            $publisher->publisher_id,
            "Updated publisher \"{$publisher->name}\""
        );

        return $this->ok($this->present($publisher->fresh()->loadCount('books')), 'Publisher updated.');
    }

    /** DELETE /api/publishers/{publisher} */
    public function destroy(Request $request, Publisher $publisher): JsonResponse
    {
        $bookCount = $publisher->books()->count();

        if ($bookCount > 0) {
            throw new DomainException(
                "Cannot delete \"{$publisher->name}\" — {$bookCount} book(s) are published by them. ".
                'Reassign those books first.',
                ['books_count' => $bookCount]
            );
        }

        $name = $publisher->name;
        $id = $publisher->publisher_id;

        $publisher->delete();

        $this->audit->record($request->user(), AuditAction::PUBLISHER_DELETED, 'publisher', $id, "Deleted publisher \"{$name}\"");

        return $this->ok(null, 'Publisher deleted.');
    }

    private function present(Publisher $publisher): array
    {
        return [
            'publisher_id' => $publisher->publisher_id,
            'name' => $publisher->name,
            'address' => $publisher->address,
            'contact_email' => $publisher->contact_email,
            'contact_phone' => $publisher->contact_phone,
            'website' => $publisher->website,
            'books_count' => $publisher->books_count ?? 0,
        ];
    }
}
