---
title: 74. Enums
---

## commit log

```plaintext
Add enum
```

添加枚举。

## type

```c
// chibicc.h
typedef enum {
  // others
  TY_ENUM,
} TypeKind;

Type *enum_type(void);

// type.c
bool is_integer(Type *ty) {
  switch(ty->kind) {
  case TY_BOOL:
  case TY_CHAR:
  case TY_SHORT:
  case TY_INT:
  case TY_LONG:
  case TY_ENUM:
    return true;
  default: break;
  }
  return false;
}

Type* enum_type(void) {
  return new_type(TY_ENUM, 4, 4);
}
```

## Lexer

添加enum关键字即可。

```c
static bool is_keyword(Token *tok) {
  static char *kw[] = {
    "return", "if", "else", "for", "while", "int", "sizeof", "char",
    "struct", "union", "short", "long", "void", "typedef", "_Bool",
    "enum"
  };
  // code
}
```

## Parser

```c
// Scope for local vaiables, global variables, typedefs
// or enum constants
typedef struct VarScope VarScope;
struct VarScope {
  VarScope *next;
  char *name;
  Obj *var;
  Type *type_def;
  Type *enum_ty;
  int enum_val;
};

typedef struct Scope Scope;
struct Scope {
  Scope *next;
  // C has two block scopes; one is for variables/typedefs
  // and the other is for struct/union/enum tags
  VarScope *vars;
  TagScope *tags;
};

static Type *enum_specifier(Token **rest, Token *tok);

static Type *declspec(Token **rest, Token *tok, VarAttr *attr) {
  // codes
  while(is_typename(tok)) {
    if (equal(tok, "typedef")) {/*  code  */}

     Type *ty2 = find_typedef(tok);
    if (equal(tok, "struct") || equal(tok, "union") || equal(tok, "enum") || ty2) {
      if (counter)
        break;

      if (equal(tok, "struct")) {
        ty = struct_decl(&tok, tok->next);
      } else if (equal(tok, "union")) {
        ty = union_decl(&tok, tok->next);
      } else if (equal(tok, "enum")) {
        ty = enum_specifier(&tok, tok->next);   // <----
      } else {
        ty = ty2; 
        tok = tok->next;
      }  

      counter += OTHER;
      continue;
    }
    // Handle built-in types
    // code
  }
}
```

然后来实现上面代码中的`enum_specifier`：

```c
// enum-specifier = ident ? "{" enum-list? "}"
//                | ident ( "{" enum-list? "}" )?
// enum-list      = ident ( "=" num )? ("," ident ("=" num)?)*
static Type *enum_specifier(Token **rest, Token *tok) {
  Type *ty = enum_type();
  // Read a struct tag.
  // for the decl: enum Color {...};
  Token *tag = NULL;
  if (tok->kind == TK_IDENT) {
    tag = tok;
    tok = tok->next;
  }
  // for the decl like: enum Color c;
  if (tag && !equal(tok, "{")) {
    Type* ty = find_tag(tag);
    if (!ty)
      error_tok(tag, "unknown enum type");
    if (ty->kind != TY_ENUM)
      error_tok(tag, "not an enum tag");
    *rest = tok;
    return ty;
  }
  tok = skip(tok, "{");
  // Read an enum-list.
  int i = 0;
  int val = 0;
  while (!equal(tok, "}")) {
    if (i++ > 0)
      tok = skip(tok, ",");
    char *name = get_ident(tok);
    tok = tok->next;
    if (equal(tok, "=")) {
      val = get_numer(tok->next);
      tok = tok->next->next; 
    }
    VarScope *sc = push_scope(name);
    sc->enum_ty = ty;
    sc->enum_val = val++;
  }
  *rest = tok->next;
  if (tag)
    push_tag_scope(tag, ty);
  return ty;
}

static Node *is_typename(Token *tok) {
  static char *kw[] = {
    "void", "_Bool", "char", "short", "int", "long", "struct", "union",
    "typedef", "enum",
  };
  // code
}

static Node *primary(Token **rest, Token *tok) {
  Token *start = tok;
  // other cases
  if (tok->kind == TK_IDENT) {
    if (equal(tok->next, "("))
      return funcall(rest, tok);
    VarScope *sc = find_var(tok);
    // 对于某一个标识符而言，它可能是变量，也可能是enum
    if (!sc || (!sc->var && !sc->enum_ty))
      error_tok(tok, "undefined variable");
    Node *node;
    if (sc->var)
      node = new_var_node(sc->var, tok);
    else // 如果是enum的话，将其解释成一个num
      node = new_num(sc->enum_val, tok);
    *rest = tok->next;
    return node;
  }
  // code
}
```

## test

```c
#include "test.h"

int main() {
  ASSERT(0, ({ enum { zero, one, two }; zero; }));
  ASSERT(1, ({ enum { zero, one, two }; one; }));
  ASSERT(2, ({ enum { zero, one, two }; two; }));
  ASSERT(5, ({ enum { five=5, six, seven }; five; }));
  ASSERT(6, ({ enum { five=5, six, seven }; six; }));
  ASSERT(0, ({ enum { zero, five=5, three=3, four }; zero; }));
  ASSERT(5, ({ enum { zero, five=5, three=3, four }; five; }));
  ASSERT(3, ({ enum { zero, five=5, three=3, four }; three; }));
  ASSERT(4, ({ enum { zero, five=5, three=3, four }; four; }));
  ASSERT(4, ({ enum { zero, one, two } x; sizeof(x); }));
  ASSERT(4, ({ enum t { zero, one, two }; enum t y; sizeof(y); }));

  printf("OK\n");
  return 0;
}
```
