<?php

namespace App\Http\Controllers\Api;

use App\Exceptions\DomainException;
use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Services\System\AuditLogService;
use App\Support\AuditAction;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CategoryController extends Controller
{
    public function __construct(private AuditLogService $audit) {}

    /** GET /api/categories */
    public function index(): JsonResponse
    {
        $categories = Category::withCount('books')
            ->orderBy('name')
            ->get()
            ->map(fn (Category $c) => [
                'category_id' => $c->category_id,
                'name' => $c->name,
                'code' => $c->code,
                'description' => $c->description,
                'books_count' => $c->books_count,
            ]);

        return $this->ok($categories);
    }

    /** POST /api/categories */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:80', 'unique:categories,name'],
            'code' => ['required', 'string', 'max:20', 'unique:categories,code'],
            'description' => ['nullable', 'string', 'max:200'],
        ]);

        $category = Category::create($data);

        $this->audit->record(
            $request->user(),
            AuditAction::CATEGORY_CREATED,
            'category',
            $category->category_id,
            "Created category \"{$category->name}\""
        );

        return $this->created($category, 'Category created.');
    }

    /** PUT /api/categories/{category} */
    public function update(Request $request, Category $category): JsonResponse
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:80', Rule::unique('categories', 'name')->ignore($category->category_id, 'category_id')],
            'code' => ['sometimes', 'string', 'max:20', Rule::unique('categories', 'code')->ignore($category->category_id, 'category_id')],
            'description' => ['nullable', 'string', 'max:200'],
        ]);

        $category->update($data);

        $this->audit->record(
            $request->user(),
            AuditAction::CATEGORY_UPDATED,
            'category',
            $category->category_id,
            "Updated category \"{$category->name}\""
        );

        return $this->ok($category->fresh(), 'Category updated.');
    }

    /** DELETE /api/categories/{category} */
    public function destroy(Request $request, Category $category): JsonResponse
    {
        $bookCount = $category->books()->count();

        if ($bookCount > 0) {
            throw new DomainException(
                "Cannot delete \"{$category->name}\" — {$bookCount} book(s) are classified under it."
            );
        }

        $name = $category->name;
        $id = $category->category_id;

        $category->delete();

        $this->audit->record($request->user(), AuditAction::CATEGORY_DELETED, 'category', $id, "Deleted category \"{$name}\"");

        return $this->ok(null, 'Category deleted.');
    }
}
