---
title: 64. Typedef Usage
---

## commit log

```plaintext
Add typedef

    In the following example, `x` is defined as an alias for `int`.
  
      typedef x;
  
    Below is valid C code where the second `t` is a local variable
    of type int having value 3.
  
      typedef int t;
      t t = 3;

```

`typedef`的加入，让我们除了可以定义变量，还可以定义类型。

## Lexer

首先加入关键字。

```c
static int read_punct(char *p) {
  static char *kw[] = {
    "return", "if", "else", "for", "while", "int", "sizeof", "char",
    "struct", "union", "short", "long", "void", "typedef",
  };
  // code
}
```

## Parser

重点是parser的修改，对于一个类型来说，其实在C当中，可以有多种属性，它可以是被`typedef`的，也可以是`extern`的。这里我们加入一个`VarAttr`结构体来凸显这种属性。

```c
typedef struct {
  bool is_typedef;
} VarAttr;
```

然后，对于每一个变量，我们知道它对应的有一个varscope，这里我们需要修改`VarScope`结构体：

```c
typedef struct VarScope VarScope;
struct VarScope {
  VarScope *next;
  char *name;
  Obj *var;
  Type *type_def;   // <----
};
```

然后修改`declspec`函数，这个函数牵涉到了`typedef`定义变量的过程，以及使用`typedef`所定义变量的过程。这个函数的定义过程中，需要指明它的变量属性。因此需要一个`VarAttr`。

```c
static Type *declspec(Token **rest, Token *tok, VarAttr *attr);
```

然后我们来看这个`declspec`的实现，为了方便回顾，我们把这个函数完整地写出来：

```c
static Node *declspec (Token **rest, Token *tok, VarAttr *attr) {
  enum {
    VOID  = 1 << 0;
    CHAR  = 1 << 2;
    SHORT = 1 << 4;
    INT   = 1 << 6;
    LONG  = 1 << 8;
    OTHER = 1 << 10;
  };

  Type *ty = ty_int;
  int counter = 0;
  // 下面的is_typename也是要被修改的，
  // 可以从原生类型和typedef类型中进行查找
  while (is_typename(tok)) {
    // 先来处理typedef
    if (equal(tok, "typedef")) {
      if (!attr)
        error_tok(tok, "storage class specifier is not allowed in this context");
      attr->is_typedef = true;
      tok = tok->next;
      continue;
    }
    // 如果是自定义类型，struct，union或者typedef
    Type *ty2 = find_typedef(tok);
    if (equal(tok, "struct") || equal(tok, "union") || ty2) {
      if (counter)
        break;

       if (equal(tok, "struct")) {
         ty = struct_decl(&tok, tok->next);
       } else if (equal(tok, "union")) {
         ty = union_decl(&tok, "union");
       } else {
         ty = ty2;
         tok = tok->next;
       }
       counter += OTHER;
       continue;
    }

    if (equal(tok, "void")) {
      counter += VOID;
    } else if (equal(tok, "char")) {
      counter += CHAR;
    } else if (equal(tok, "short")) {
      counter += SHORT;
    } else if (equal(tok, "int")) {
      counter += INT;
    } else if (equal(tok, "long")) {
      counter += LONG;
    } else {
      unreachable();
    }

    switch (counter) {
    case VOID:
      ty = ty_void; break;
    case CHAR:
      ty = ty_char; break;
    case SHORT:
    case SHORT + INT:
      ty = ty_short; break;
    case INT:
      ty = ty_int; break;
    case LONG:
    case LONG + INT:
    case LONG + LONG:
    case LONG + LONG + INT:
      ty = ty_long; break;
    default:
      error_tok(tok, "invalid type");
    }
    tok = tok->next;
  }
  *rest = tok;
  return ty;
}
```

上面的函数中，我们用到了`is_typename`函数，这个函数原本只能用于识别关键字，现在我们需要将其修改，令其可以识别`typedef`的类型。

```c
static bool is_typename(Token *tok) {
  static char *kw[] = {
    "void", "char", "short", "int", "long", "struct", "union",
    "typedef",
  };

  for (int i = 0; i < sizeof(kw) /  sizeof(*kw); i++)
    if (equal(tok, kw[i]))
      return true;
  return find_typedef(tok);
}
```

上面的函数中又使用了`find_typedef`，我们来将其实现：

```c
static Type *find_typedef(Token *tok) {
  if (tok->kind = TK_IDENT) {
    VarScope *sc = find_var(tok);
    if (sc)
      return sc->type_def;
  }
  return NULL;
}
```

注意这里的`find_var`，原先我们是返回一个`Obj`的，这里我们返回了一个`VarScope`，因为我们同时也把`find_var`修改了。

```c
static VarScope *find_var(Token *tok) {
  for (Scope *sc = scope; sc; sc = sc->next) {
    for(VarScope *sc2 = sc->vars; sc2; sc2 = sc2->next) {
      if (equal(tok, sc2->name))
        return sc2;
    }
  }
  return NULL;
}
```

接下来我们需要完善`typedef`，先前的`declspec`仅仅是识别出了`typedef`以及要定义的类型，但是对于新的类型名还没有处理，我们这里实现一个`parse_typeder`函数：

```c
static Token *parse_typedef(Token *tok, Type *basety) {
  bool first = true;

  while (!consume(&tok, tok, ";")) {
    if (!first)
      tok = skip(tok, ",")
    first = false;

    Type *ty = declarator(&tok, tok, basety);
    push_scope(get_ident(ty->name))->type_def = ty;
  }
  return tok;
}
```

注意这里的`push_scope`，原本的`push_scope`是针对一个变量的，因此有两个参数，第二个参数是`Obj`。但是现在的情况是，我们的push_scope也可能需要把一个类型给push进来，因此push_scope的定义也需要修改：

```c
static VarScope *push_scope(char *name) {
  VarScope *sc = calloc(1, sizeof(VarScope));
  sc->name = name;
  sc->next = scope->vars;
  scope->vars = sc;
  return sc;
}
```

最后，就是修改变量声明的部分了，这一块主要在`compound_stmt`的部分：

```c
static Node *compound_stmt(Token **rest, Token *tok) {
  enter_scope();
  while(!equal(tok, "}")) {
    if (is_typename(tok)) {
      VarAttr attr = {};
      Type *basety = declspec(&tok, tok, &attr);
      if (attr.is_typedef) {
        tok = parse_typedef(tok, basety);
        continue;
      }
      cur = cur->next = declaration(&tok, tok, basety);
    } else {
      cur = cur->next = stmt(&tok, tok);
    }
    add_type(cur);
  }
  leave_scope();

  node->body = head.next;
  *rest = tok->next;
  return node;
}
```

注意这里我们又修改了`declaration`，原先的declaration是根据tok进行查找相应的类型，但是有了`typedef`之后，这条路径就不太行，因此将其定义修改一下，变成如下的形式：

```c
static Node *declaration(Token **rest, Token *tok, Type *basety);
```

除此之外，因为我们先前修改了`declspec`，`find_var`，`push_scope`，`declaration`函数的定义，因此也需要同步修改其它调用这些函数的函数：

```c
static Obj* new_var(char *name, Type *ty) {
  // code
  push_scope(name)->var = var;
  return var;
  // code
}

static Type *func_params(Token **rest, Token *tok, Type *ty) {
  // code
  Type *basety = declspec(&tok, tok, NULL);
  // code
}

static void struct_members(Token **rest, Token *tok, Type *ty) {
  // code
  while (!equal(tok, "}")) {
    TYoe *basety = declspec(&tok, tok, NULL);
    // code
  }
  // code
}

static Node *primary(Token **rest, Token *tok) {
  // code
  VarScope *sc = find_var(tok);
  if (!sc || !sc->var)
    error_tok(tok, "undefined variavle");
  *rest = tok->next;
  return new_var_node(sc->var, tok);
}

Obj *parse(Token *tok) {
  globals = NULL;
  while(tok->kind != TK_EOF) {
    VarAttr attr = {};
    Type* basety = declspec(&tok, tok, &attr);
    // Typedef
    if (attr.is_typedef) {
      tok = parse_typedef(tok, basety);
      continue;
    }
    // other code
  }
}
```

## 测例

```c
// typedef.c
#include "test.h"

typedef int MyInt, MyInt2[4];
typedef int;

int main() {
  ASSERT(1, ({ typedef int t; t x=1; x; }));
  ASSERT(1, ({ typedef struct {int a;} t; t x; x.a=1; x.a; }));
  ASSERT(1, ({ typedef int t; t t=1; t; }));
  ASSERT(2, ({ typedef struct {int a;} t; { typedef int t; } t x; x.a=2; x.a; }));
  ASSERT(4, ({ typedef t; t x; sizeof(x); }));
  ASSERT(3, ({ MyInt x=3; x; }));
  ASSERT(16, ({ MyInt2 x; sizeof(x); }));

  printf("OK\n");
  return 0;
}
```
