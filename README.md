# Debian Fundamentals
Joseph Berg

A web-hosted version of the 2001 book [Debian GNU/Linux : Guide to Installation and Usage by Goerzen and Othman](https://www.gutenberg.org/ebooks/6527).

## ER Diagram
```mermaid
---
title: Debian Fundamentals
---
erDiagram
    chapter ||--|{ section : has
    chapter {
        id SERIAL pk
        title TEXT "Chapter title"
        number INT "Chapter number"
    }
    section ||--|{ element : has
    section {
        id SERIAL pk
        chapter_id INT fk "Chapter ID"
        title TEXT "Section title"
        number INT "Section number"
    }
    element_type ||--o{ element : is
    element_type {
        id SERIAL pk
        description TEXT "footnote, quote, paragraph, etc"
    }
    element {
        id SERIAL pk
        section_id INT fk "Section ID"
        element_type_id INT fk "Element type ID"
        index INT "1st element, 2nd element..."
        content TEXT "Contents of the element"
    }