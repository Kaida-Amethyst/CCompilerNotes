---
title: 90. Break Statement
---

## commit log

```plaintext
Add break statement
```

添加break语句。

## Lexer

这里我们把`break`和`continue`都加上。

```c
static bool is_keyword(Token *tok) {
  static char *kw[] = {
     "return", "if", "else", "for", "while", "int", "sizeof", "char",
     "struct", "union", "short", "long", "void", "typedef", "_Bool",
     "enum", "static", "goto", "break", "continue"
  };
  // ...
}
```

## Parser

```c
// chibicc.h
struct Node {
  // other fields
  // "break" label
  char *brk_label;
};

// Parser.c
static char *brk_label;

static Node *stmt (Token **rest, Token *tok) {
  // other cases
  if (equal(tok, "for")) {
    Node* node = new_node(ND_FOR, tok);
    tok = skip(tok->next, "(");
    enter_scope();
    char *brk = brk_label;
    brk_label = node->brk->label = new_unique_name();

    if (is_typenamentok)) {
      Type *basety = declspec(&tok, tok, NULL);
      node->init = declaration(&tok, tok, basety);
    } else {
      node->init = expr_stmt(&tok, tok);
    }  

    if (!equal(tok, ";"))
      node->cond = expr(&tok, tok);
    tok = skip(tok, ";");

    if (!equal(tok, ")"))
      node->inc = expr(&tok, tok);
    tok = skip(tok, ")");

    node->then = stmt(rest, tok);

    leave_scope();
    brk_label = brk; 
    return node;
  }

  if (equal(tok, "while")) {
    Node *node = new_node(ND_FOR, tok);
    tok = skip(tok->next, "(");
    node->cond = expr(&tok, tok);
    tok = skip(tok, ")");

    char *brk = brk_label;
    brk_label = node->brk_label = new_unique_name();
    node->then = stmt(rest, tok);
    brk_label = brk;
    return node;
  }

  if (equal(tok, "break")) {
    if (!brk_label)
      error_tok(tok, "stray break");
    Node *node = new_node(ND_GOTO, tok);
    node->unique_label = brk_label;
    *rest = skip(tok->next, ";");
    return node;
  }
}
```

## Codegen

```c
static void gen_stmt(Node *node) {
  switch(node->kind) {
  case ND_FOR: {
    int c = count();
    if (node->init)
      gen_stmt(node->init);
    println(".L.begin.%d:", c); 
    if (node->cond) {
      gen_expr(node->cond);
      println("  cmp $0, %%rax");
      println("  je %s", node->brk_label);
    }   
    gen_stmt(node->then);
    if (node->inc)
      gen_expr(node->inc);
    println("  jmp .L.begin.%d", c); 
    println("%s:", node->brk_label);
    return;
  }
  }
}
```

## test

```c
// control.c
int main() {
  ASSERT(3, ({ int i=0; for(;i<10;i++) { if (i == 3) break; } i; }));
  ASSERT(4, ({ int i=0; while (1) { if (i++ == 3) break; } i; }));
  ASSERT(3, ({ int i=0; for(;i<10;i++) { for (;;) break; if (i == 3) break; } i; }));
  ASSERT(4, ({ int i=0; while (1) { while(1) break; if (i++ == 3) break; } i; }));
}
```
