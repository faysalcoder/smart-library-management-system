<?php

namespace App\Http\Controllers\Api;

use App\Exceptions\DomainException;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreBookRequest;
use App\Http\Requests\UpdateBookRequest;
use App\Http\Requests\UploadImageRequest;
use App\Http\Resources\BookCopyResource;
use App\Http\Resources\BookResource;
use App\Models\Book;
use App\Models\BookCopy;
use App\Services\Catalog\BookCatalogService;
use App\Services\Catalog\BookSearchService;
use App\Services\System\AuditLogService;
use App\Services\System\SupabaseStorageService;
use App\Support\AuditAction;
use App\Support\Status;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class BookController extends Controller
{
    public function __construct(
        private BookCatalogService $catalog,
        private BookSearchService $search,
        private SupabaseStorageService $storage,
        private AuditLogService $audit,
    ) {}

    /** GET /api/books — FR-02 / FR-06 */
    public function index(Request $request): JsonResponse
    {
        $results = $this->search->search($request->all());

        return $this->paginated(
            $results,
            BookResource::collection($results->getCollection())->resolve()
        );
    }

    /** GET /api/books/suggest?q= — typeahead */
    public function suggest(Request $request): JsonResponse
    {
        return $this->ok($this->search->suggest((string) $request->query('q', '')));
    }

    /**
     * GET /api/books/{book}
     *
     * §3.5.1 — "if unavailable, the system informs the student and may show
     * alternative available books or related suggestions". The `related` list
     * is therefore always returned, and the client leads with it when every
     * copy of this title is out.
     */
    public function show(Book $book): JsonResponse
    {
        $book->load([
            'category',
            'author',
            'publisher',
            'copies' => fn ($q) => $q->orderBy('accession_no'),
        ]);

        return $this->ok([
            'book' => new BookResource($book),
            'related' => BookResource::collection($this->search->related($book))->resolve(),
        ]);
    }

    /** POST /api/books — FR-06 */
    public function store(StoreBookRequest $request): JsonResponse
    {
        $book = $this->catalog->create($request->validated(), $request->user());

        return $this->created(new BookResource($book), 'Book added to the catalog.');
    }

    /** PUT /api/books/{book} */
    public function update(UpdateBookRequest $request, Book $book): JsonResponse
    {
        $book = $this->catalog->update($book, $request->validated(), $request->user());

        return $this->ok(new BookResource($book), 'Book updated.');
    }

    /** DELETE /api/books/{book} — BR-10 */
    public function destroy(Request $request, Book $book): JsonResponse
    {
        $this->catalog->delete($book, $request->user());

        return $this->ok(null, 'Book deleted.');
    }

    /** POST /api/books/{book}/cover — multipart image upload */
    public function uploadCover(UploadImageRequest $request, Book $book): JsonResponse
    {
        $previous = $book->cover_image;
        $url = $this->storage->upload($request->file('image'), 'covers');

        $book->update(['cover_image' => $url]);
        $this->storage->delete($previous);

        $this->audit->record(
            $request->user(),
            AuditAction::BOOK_UPDATED,
            'book',
            $book->book_id,
            "Updated cover image for \"{$book->title}\""
        );

        return $this->ok(new BookResource($book->fresh(['category', 'author', 'publisher'])), 'Cover image updated.');
    }

    // ---- Copies ----------------------------------------------------------

    /** GET /api/books/{book}/copies */
    public function copies(Book $book): JsonResponse
    {
        return $this->ok(
            BookCopyResource::collection($book->copies()->orderBy('accession_no')->get())
        );
    }

    /** POST /api/books/{book}/copies — auto-generates accession numbers */
    public function addCopies(Request $request, Book $book): JsonResponse
    {
        $data = $request->validate([
            'quantity' => ['required', 'integer', 'min:1', 'max:100'],
        ]);

        $copies = $this->catalog->addCopies($book, (int) $data['quantity'], $request->user());

        return $this->created(
            BookCopyResource::collection(collect($copies)),
            sprintf('%d copy/copies added.', count($copies))
        );
    }

    /** PUT /api/copies/{copy} */
    public function updateCopy(Request $request, BookCopy $copy): JsonResponse
    {
        $data = $request->validate([
            'status' => ['sometimes', Rule::in(Status::COPY_ALL)],
            'condition' => ['sometimes', Rule::in(Status::CONDITION_ALL)],
        ]);

        $copy = $this->catalog->updateCopy($copy, $data, $request->user());

        return $this->ok(new BookCopyResource($copy), 'Copy updated.');
    }

    /** DELETE /api/copies/{copy} */
    public function destroyCopy(Request $request, BookCopy $copy): JsonResponse
    {
        $this->catalog->deleteCopy($copy, $request->user());

        return $this->ok(null, 'Copy removed.');
    }

    /** GET /api/copies/lookup/{barcode} — scanner endpoint */
    public function lookupByBarcode(string $barcode): JsonResponse
    {
        $copy = BookCopy::with('book.category', 'book.author')
            ->where('barcode', $barcode)
            ->orWhere('accession_no', $barcode)
            ->first();

        if (! $copy) {
            throw new DomainException(
                'Barcode not recognised. Check the label, or add this copy in Catalog Management.',
                ['barcode' => $barcode],
                404
            );
        }

        return $this->ok(new BookCopyResource($copy));
    }
}
