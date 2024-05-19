---
title: 75. File Level Functions
---

## commit log

```plaintext
Support file-scope functions.
```

支持static函数。

## 思路

主要是把生成的汇编文件中的`.global`修改成`.local`。

## 头文件

```c
struct Obj {
  // Global variable or function
  bool is_function;
  bool is_definition;
  bool is_static;
};
```

## Lexer

```c
static bool is_keyword(Token *tok) {
  static char *kw[] = {
     "return", "if", "else", "for", "while", "int", "sizeof", "char",
     "struct", "union", "short", "long", "void", "typedef", "_Bool",
     "enum", "static",
  };
  // code
}
```

## parser

```c
static bool is_typename(Token *tok) {
  static char *kw[] = {
    "void", "_Bool", "char", "short", "int", "long", "struct", "union",
    "typedef", "enum", "static",
  };
  // code
}

static Type *declspec(Token **rest, Token *tok, VarAttr *attr) {
  // code
  while(is_typename(tok)) {
    if (equal(tok, "typedef") || equal(tok, "static")) {
      if (!attr)
        error_tok(tok, "storgae class specifier is not allowed in this context");
      if (equal(tok, "typedef")) 
        attr->is_typedef = true;
      else
        attr->is_static = true;
      if (attr->is_typedef + attr->is_static > 1)
        error_tok(tok, "typedef and static may not be used together");
      tok = tok->next;
      continue; 
    }
  // code
  }
}

static Token *function(Token *tok, Type *basety, VarAttr *attr) {
   Type *ty = declarator(&tok, tok, basety);
 
   Obj *fn = new_gvar(get_ident(ty->name), ty);
   fn->is_function = true;
   fn->is_definition = !consume(&tok, tok, ";");
   fn->is_static = attr->is_static;
   // code
}

Obj* parse(Token *tok) {
  // code
  // Function
  if (is_function(tok)) {
    tok = function(tok, basety, &attr);
    continue;
  }
  // code
}
```

## codegen

```c
static void emit_text(Obj* prog) {
  if (!fn->is_function || !fn->is_definition) 
    continue;
  if (fn->is_static)
    println("  .local %s", fn->name);
  else
    println("  .global %s", fn->name);
  // code
}
```

## test

```c
// commom
static int static_fn() { return 5; }
// function.c
static int static_fn() { return 3; }

int main() {
  ASSERT(3, static_fn());
  return 0;
}
```
