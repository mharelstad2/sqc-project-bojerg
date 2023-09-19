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

// Breaking down the DOM of book.html
let bookParts = domRoot.querySelectorAll('.chapter')
let chapters = {}

// Only want content from the Guide portion of the book
const startFlag = 'I. Guide'
const stopFlag = 'II. Reference'
let collectDivs = false

bookParts.forEach(
  (div) => {
    let title = ''
    let headers = div.querySelectorAll("h2, h3")
    if(headers.length > 0) {
      title = headers[0].innerText
    }
    if(title == stopFlag) {
      collectDivs = false
    } else if(collectDivs) { // collectDivs set to true at bottom of function
	  //Start collecting HTML and additional required data
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

    // Each h2/h3 tag has an anchor tab named something like chap01 or chap01.4 ...
	// We split into two parts, chapter and section
	const chapterAndSection = headers[0].querySelector('a').id.split('.')
	
	// remove the chap from the number 
	chapterAndSection[0] = Number(chapterAndSection[0].substring(4))
	
	if(chapterAndSection.length == 1) {
		chapterAndSection.push(0) //If no section listed, we are working with chapter intro
	} else {
		chapterAndSection[1] = Number(chapterAndSection[1])
	}
	
	
	

    }

    if(title == startFlag) {
      collectDivs = true
    }
  }
)
