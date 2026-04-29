CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    order_index INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS theory_blocks (
    id SERIAL PRIMARY KEY,
    category_id INT REFERENCES categories(id) ON DELETE CASCADE,
    title VARCHAR(200),
    content TEXT NOT NULL,
    order_index INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS exercises (
    id SERIAL PRIMARY KEY,
    category_id INT REFERENCES categories(id) ON DELETE CASCADE,
    theory_block_id INT REFERENCES theory_blocks(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    starter_code TEXT,
    solution_code TEXT,
    hint TEXT,
    difficulty INT DEFAULT 1,
    order_index INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS user_attempts (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    exercise_id INT REFERENCES exercises(id) ON DELETE CASCADE,
    user_code TEXT,
    is_correct BOOLEAN,
    attempt_number INT DEFAULT 1,
    submitted_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO categories (name, description, order_index) VALUES
('Osnovy makrosov', 'Izuchite bazovyy sintaksis i strukturu makrosov', 1),
('Rabota s tekstom', 'Makrosy dlya Writer: vstavka, formatirovanie, poisk', 2),
('Rabota s tablicami', 'Makrosy dlya Calc: yacheyki, formuly', 3);

INSERT INTO theory_blocks (category_id, title, content, order_index) VALUES
(1, 'Pervyy makros', '<p>Makros nachinaetsya s <strong>Sub</strong> i zakanchivaetsya <strong>End Sub</strong>.</p><pre>Sub MyMacro()\n    MsgBox "Hello"\nEnd Sub</pre>', 1),
(2, 'Vstavka teksta', '<p>Ispolzuyte <strong>insertString</strong> dlya dobavleniya teksta.</p><pre>oText.insertString(oText.End, "tekst", False)</pre>', 1),
(3, 'Rabota s yacheykami', '<p>Yacheyki Calc: <strong>getCellByPosition(kolonka, stroka)</strong></p><pre>oSheet.getCellByPosition(0,0).setValue(100)</pre>', 1);

INSERT INTO exercises (category_id, theory_block_id, title, description, starter_code, solution_code, hint, difficulty, order_index) VALUES
(1, 1, 'Privet, mir!', 'Sozdayte makros "HelloWorld", kotoryy vyvodit soobshchenie "Hello, World!"',
 'Sub HelloWorld()\n    \nEnd Sub',
 'Sub HelloWorld()\n    MsgBox "Hello, World!"\nEnd Sub',
 'Ispolzuyte MsgBox', 1, 1),

(1, 1, 'Privetstvie po imeni', 'Obyavite peremennuyu name, prisvoyte "Anna", vyvedite "Privet, Anna"',
 'Sub Greeting()\n    \nEnd Sub',
 'Sub Greeting()\n    Dim name As String\n    name = "Anna"\n    MsgBox "Privet, " & name\nEnd Sub',
 'Ispolzuyte Dim As String', 2, 2),

(2, 2, 'Dobavit tekst v konec', 'Dobavte slovo "Konec" v konec dokumenta Writer',
 'Sub AddEnd()\n    \nEnd Sub',
 'Sub AddEnd()\n    Dim oText As Object\n    oText = ThisComponent.Text\n    oText.insertString(oText.End, "Konec", False)\nEnd Sub',
 'Ispolzuyte ThisComponent.Text.insertString', 1, 1);