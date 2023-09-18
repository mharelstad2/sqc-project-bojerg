import { parse } from 'node-html-parser'
import { closeSync, openSync, readFileSync, writeFileSync }
  from 'node:fs'

const dstPath = 'docs/generated-schema.sql'
const src = readFileSync('data/book.html', 'utf8')
const domRoot = parse(src)
const sqlHeader = `SET client_encoding = 'UTF8';
DROP TABLE IF EXISTS chapter;
DROP TABLE IF EXISTS section;
DROP TABLE IF EXISTS element_type;
DROP TABLE IF EXISTS element;

CREATE TABLE chapter (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  number INT NOT NULL
);

CREATE TABLE section (
  id SERIAL PRIMARY KEY,
  chapter_id INT NOT NULL, 
  title TEXT NOT NULL,
  number INT NOT NULL,
  FOREIGN KEY (chapter_id) REFERENCES chapter(id)
);

CREATE TABLE element_type (
  id SERIAL PRIMARY KEY,
  description TEXT NOT NULL
);

CREATE TABLE element (
  id SERIAL PRIMARY KEY,
  section_id TEXT NOT NULL,
  element_type_id INT NOT NULL,
  index INT NOT NULL,
  content TEXT NOT NULL,
  FOREIGN KEY (section_id) REFERENCES section(id),
  FOREIGN KEY (element_type_id) REFERENCES element_type(id)
);

INSERT INTO element_type (description)
  VALUES (paragraph, letter, footnote, noindent, table, code, non_section_header, image);

INSERT INTO chapter (title, number) VALUES
`
const sqlInsertSection = `INSERT INTO section (chapter_id, title, number) VALUES`
const sqlInsertElement = `INSERT INTO element (section_id, element_type_id, index, content) VALUES`

let guide = domRoot.querySelectorAll('.chapter')
let chapters = []
let collectDivs = false
const startFlag = 'I. Guide'
const stopFlag = 'II. Reference'

guide.forEach(
  (div) => {
    let title = ''
    let headers = div.querySelectorAll("h2, h3")
    if(headers.length > 0) {
      title = headers[0].innerText
    }
    if(title == stopFlag) {
      collectDivs = false
    } else if(collectDivs) { // collectDivs set to true at bottom of function

      // Fix img paths
      div.querySelectorAll('img').forEach(
      (image) => {
        const oldSrc = image.getAttribute('src')
        const oldSrcTokens = oldSrc.split('/')
        const newSrc = `/images/book/${oldSrcTokens[oldSrcTokens.length - 1]}`
        image.setAttribute('src', newSrc)
      }
    )

    div.innerHTML = div.innerHTML.replaceAll('\r\n', '\n')
    div.innerHTML = div.innerHTML.trim()

    //TODO parse through html and add to chapters array as if it were the database
    //Adapt the utility function in here along

    }

    if(title == startFlag) {
      collectDivs = true
    }
  }
)
