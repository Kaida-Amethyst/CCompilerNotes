---
title: 98. Skip Excess Initializers
---

## commit log

```plaintext
Skip excess initializer elements
```

功能与上一次commit类似。

## Parser

```c
static Token *skip_excess_element(Token *tok) {
  if (equal(tok, "{")) {
    tok = skip_excess_element(tok->next);
    return skip(tok, "}");
  }

  assign(&tok, tok);
  return tok;
}

// initializer = "{" initializer ("," initializer)* "}"
//             | assign
static void initializer2(Token **rest, Token *tok, Initializer *init) {
  if (init->ty->kind == TY_ARRAY) {
    tok = skip(tok, "{");

    for (int i = 0; !consume(rest, tok, "}"); i++) {
      if (i > 0) 
        tok = skip(tok, ",");

      if (i < init->ty->array_len)
        initializer2(&tok, tok, init->children[i]);
      else 
        tok = skip_excess_element(tok);
    }  
    return;
  }

  init->expr = assign(rest, tok);
}
```

‍
