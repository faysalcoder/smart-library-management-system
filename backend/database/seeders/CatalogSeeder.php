<?php

namespace Database\Seeders;

use App\Models\Author;
use App\Models\Book;
use App\Models\BookCopy;
use App\Models\Category;
use App\Models\Publisher;
use App\Models\SystemSetting;
use App\Support\Status;
use Illuminate\Database\Seeder;

class CatalogSeeder extends Seeder
{
    public function run(): void
    {
        $categories = [
            ['name' => 'Computer Science', 'code' => 'CS', 'description' => 'Computing, programming and software engineering'],
            ['name' => 'Database Systems', 'code' => 'DB', 'description' => 'Database design, administration and theory'],
            ['name' => 'Mathematics', 'code' => 'MATH', 'description' => 'Pure and applied mathematics'],
            ['name' => 'Electrical Engineering', 'code' => 'EEE', 'description' => 'Electrical and electronic engineering'],
            ['name' => 'Business Administration', 'code' => 'BBA', 'description' => 'Management, finance and marketing'],
            ['name' => 'Literature', 'code' => 'LIT', 'description' => 'Fiction, poetry and literary criticism'],
            ['name' => 'Reference', 'code' => 'REF', 'description' => 'Dictionaries, encyclopaedias and handbooks'],
        ];

        foreach ($categories as $category) {
            Category::updateOrCreate(['code' => $category['code']], $category);
        }

        $cs = Category::where('code', 'CS')->value('category_id');
        $db = Category::where('code', 'DB')->value('category_id');
        $math = Category::where('code', 'MATH')->value('category_id');
        $eee = Category::where('code', 'EEE')->value('category_id');
        $bba = Category::where('code', 'BBA')->value('category_id');
        $lit = Category::where('code', 'LIT')->value('category_id');

        // ---- Authors (DFD L-1 "List of Authors") ---------------------------
        $authorSeed = [
            ['name' => 'Abraham Silberschatz', 'nationality' => 'American'],
            ['name' => 'Martin Kleppmann', 'nationality' => 'British'],
            ['name' => 'Pramod J. Sadalage', 'nationality' => 'Indian'],
            ['name' => 'Ramez Elmasri', 'nationality' => 'American'],
            ['name' => 'Thomas H. Cormen', 'nationality' => 'American'],
            ['name' => 'Robert C. Martin', 'nationality' => 'American'],
            ['name' => 'Erich Gamma', 'nationality' => 'Swiss'],
            ['name' => 'James F. Kurose', 'nationality' => 'American'],
            ['name' => 'Stuart Russell', 'nationality' => 'British'],
            ['name' => 'Mark Allen Weiss', 'nationality' => 'American'],
            ['name' => 'Erwin Kreyszig', 'nationality' => 'German'],
            ['name' => 'David C. Lay', 'nationality' => 'American'],
            ['name' => 'James Stewart', 'nationality' => 'Canadian'],
            ['name' => 'Adel S. Sedra', 'nationality' => 'Canadian'],
            ['name' => 'Charles K. Alexander', 'nationality' => 'American'],
            ['name' => 'Philip Kotler', 'nationality' => 'American'],
            ['name' => 'Stephen A. Ross', 'nationality' => 'American'],
            ['name' => 'George Orwell', 'nationality' => 'British'],
            ['name' => 'Harper Lee', 'nationality' => 'American'],
        ];

        foreach ($authorSeed as $author) {
            Author::updateOrCreate(['name' => $author['name']], $author);
        }

        // ---- Publishers (DFD L-0 "Publisher Management") -------------------
        $publisherSeed = [
            ['name' => 'McGraw-Hill', 'website' => 'https://www.mheducation.com'],
            ['name' => "O'Reilly Media", 'website' => 'https://www.oreilly.com'],
            ['name' => 'Addison-Wesley', 'website' => 'https://www.pearson.com'],
            ['name' => 'Pearson', 'website' => 'https://www.pearson.com'],
            ['name' => 'MIT Press', 'website' => 'https://mitpress.mit.edu'],
            ['name' => 'Prentice Hall', 'website' => 'https://www.pearson.com'],
            ['name' => 'Wiley', 'website' => 'https://www.wiley.com'],
            ['name' => 'Oxford University Press', 'website' => 'https://global.oup.com'],
            ['name' => 'Cengage', 'website' => 'https://www.cengage.com'],
            ['name' => 'Penguin Books', 'website' => 'https://www.penguin.co.uk'],
            ['name' => 'Harper Perennial', 'website' => 'https://www.harpercollins.com'],
        ];

        foreach ($publisherSeed as $publisher) {
            Publisher::updateOrCreate(['name' => $publisher['name']], $publisher);
        }

        $authors = Author::pluck('author_id', 'name');
        $publishers = Publisher::pluck('publisher_id', 'name');

        $books = [
            ['isbn' => '978-0-07-352332-3', 'title' => 'Database System Concepts', 'author' => 'Abraham Silberschatz', 'publisher' => 'McGraw-Hill', 'publication_year' => 2019, 'edition' => '7th', 'category_id' => $db, 'shelf_no' => 'C-14', 'copies' => 5],
            ['isbn' => '978-1-4493-7332-0', 'title' => 'Designing Data-Intensive Applications', 'author' => 'Martin Kleppmann', 'publisher' => "O'Reilly Media", 'publication_year' => 2017, 'edition' => '1st', 'category_id' => $db, 'shelf_no' => 'C-15', 'copies' => 3],
            ['isbn' => '978-0-321-82662-6', 'title' => 'NoSQL Distilled', 'author' => 'Pramod J. Sadalage', 'publisher' => 'Addison-Wesley', 'publication_year' => 2012, 'edition' => '1st', 'category_id' => $db, 'shelf_no' => 'C-16', 'copies' => 2],
            ['isbn' => '978-0-13-397077-7', 'title' => 'Fundamentals of Database Systems', 'author' => 'Ramez Elmasri', 'publisher' => 'Pearson', 'publication_year' => 2015, 'edition' => '7th', 'category_id' => $db, 'shelf_no' => 'C-17', 'copies' => 4],
            ['isbn' => '978-0-262-03384-8', 'title' => 'Introduction to Algorithms', 'author' => 'Thomas H. Cormen', 'publisher' => 'MIT Press', 'publication_year' => 2009, 'edition' => '3rd', 'category_id' => $cs, 'shelf_no' => 'A-01', 'copies' => 6],
            ['isbn' => '978-0-13-235088-4', 'title' => 'Clean Code', 'author' => 'Robert C. Martin', 'publisher' => 'Prentice Hall', 'publication_year' => 2008, 'edition' => '1st', 'category_id' => $cs, 'shelf_no' => 'A-02', 'copies' => 4],
            ['isbn' => '978-0-201-63361-0', 'title' => 'Design Patterns', 'author' => 'Erich Gamma', 'publisher' => 'Addison-Wesley', 'publication_year' => 1994, 'edition' => '1st', 'category_id' => $cs, 'shelf_no' => 'A-03', 'copies' => 3],
            ['isbn' => '978-0-13-359162-9', 'title' => 'Computer Networking: A Top-Down Approach', 'author' => 'James F. Kurose', 'publisher' => 'Pearson', 'publication_year' => 2016, 'edition' => '7th', 'category_id' => $cs, 'shelf_no' => 'A-04', 'copies' => 5],
            ['isbn' => '978-0-13-604259-4', 'title' => 'Artificial Intelligence: A Modern Approach', 'author' => 'Stuart Russell', 'publisher' => 'Pearson', 'publication_year' => 2020, 'edition' => '4th', 'category_id' => $cs, 'shelf_no' => 'A-05', 'copies' => 4],
            ['isbn' => '978-0-07-338309-5', 'title' => 'Operating System Concepts', 'author' => 'Abraham Silberschatz', 'publisher' => 'Wiley', 'publication_year' => 2018, 'edition' => '10th', 'category_id' => $cs, 'shelf_no' => 'A-06', 'copies' => 5],
            ['isbn' => '978-0-321-57351-3', 'title' => 'Data Structures and Algorithm Analysis', 'author' => 'Mark Allen Weiss', 'publisher' => 'Pearson', 'publication_year' => 2013, 'edition' => '3rd', 'category_id' => $cs, 'shelf_no' => 'A-07', 'copies' => 3],
            ['isbn' => '978-0-471-48885-9', 'title' => 'Advanced Engineering Mathematics', 'author' => 'Erwin Kreyszig', 'publisher' => 'Wiley', 'publication_year' => 2011, 'edition' => '10th', 'category_id' => $math, 'shelf_no' => 'M-01', 'copies' => 6],
            ['isbn' => '978-0-321-98238-4', 'title' => 'Linear Algebra and Its Applications', 'author' => 'David C. Lay', 'publisher' => 'Pearson', 'publication_year' => 2015, 'edition' => '5th', 'category_id' => $math, 'shelf_no' => 'M-02', 'copies' => 4],
            ['isbn' => '978-1-118-06333-0', 'title' => 'Calculus: Early Transcendentals', 'author' => 'James Stewart', 'publisher' => 'Cengage', 'publication_year' => 2015, 'edition' => '8th', 'category_id' => $math, 'shelf_no' => 'M-03', 'copies' => 5],
            ['isbn' => '978-0-07-338057-5', 'title' => 'Microelectronic Circuits', 'author' => 'Adel S. Sedra', 'publisher' => 'Oxford University Press', 'publication_year' => 2014, 'edition' => '7th', 'category_id' => $eee, 'shelf_no' => 'E-01', 'copies' => 4],
            ['isbn' => '978-0-13-212695-6', 'title' => 'Fundamentals of Electric Circuits', 'author' => 'Charles K. Alexander', 'publisher' => 'McGraw-Hill', 'publication_year' => 2016, 'edition' => '6th', 'category_id' => $eee, 'shelf_no' => 'E-02', 'copies' => 3],
            ['isbn' => '978-0-13-345542-5', 'title' => 'Principles of Marketing', 'author' => 'Philip Kotler', 'publisher' => 'Pearson', 'publication_year' => 2017, 'edition' => '17th', 'category_id' => $bba, 'shelf_no' => 'B-01', 'copies' => 5],
            ['isbn' => '978-1-292-26151-1', 'title' => 'Corporate Finance', 'author' => 'Stephen A. Ross', 'publisher' => 'McGraw-Hill', 'publication_year' => 2018, 'edition' => '12th', 'category_id' => $bba, 'shelf_no' => 'B-02', 'copies' => 3],
            ['isbn' => '978-0-14-118776-1', 'title' => 'Nineteen Eighty-Four', 'author' => 'George Orwell', 'publisher' => 'Penguin Books', 'publication_year' => 2008, 'edition' => 'Reissue', 'category_id' => $lit, 'shelf_no' => 'L-01', 'copies' => 4],
            ['isbn' => '978-0-06-112008-4', 'title' => 'To Kill a Mockingbird', 'author' => 'Harper Lee', 'publisher' => 'Harper Perennial', 'publication_year' => 2006, 'edition' => 'Reissue', 'category_id' => $lit, 'shelf_no' => 'L-02', 'copies' => 3],
        ];

        $sequence = 1;

        foreach ($books as $data) {
            $copyCount = $data['copies'];
            unset($data['copies']);

            // Swap the readable names above for their entity ids.
            $data['author_id'] = $authors[$data['author']];
            $data['publisher_id'] = $publishers[$data['publisher']] ?? null;
            unset($data['author'], $data['publisher']);

            $book = Book::updateOrCreate(['isbn' => $data['isbn']], $data + ['language' => 'English']);

            // Only create copies the first time this book is seeded.
            $existing = $book->copies()->count();

            for ($i = $existing; $i < $copyCount; $i++) {
                $accession = 'ACC-'.str_pad((string) $sequence, 5, '0', STR_PAD_LEFT);
                $sequence++;

                BookCopy::updateOrCreate(
                    ['accession_no' => $accession],
                    [
                        'book_id' => $book->book_id,
                        'barcode' => $accession,
                        'status' => Status::COPY_AVAILABLE,
                        'condition' => 'good',
                        'acquired_on' => now()->subMonths(rand(1, 36))->toDateString(),
                    ]
                );
            }

            $book->recalculateCopyCounters();
        }

        // Keep the accession generator ahead of the seeded numbers.
        SystemSetting::updateOrCreate(
            ['key' => 'accession_sequence'],
            ['value' => (string) ($sequence + 100), 'type' => 'int', 'group' => 'internal', 'label' => 'Accession sequence']
        );

        $this->command->info(sprintf(
            'Seeded %d authors, %d publishers and %d books with copies.',
            count($authorSeed),
            count($publisherSeed),
            count($books)
        ));
    }
}
