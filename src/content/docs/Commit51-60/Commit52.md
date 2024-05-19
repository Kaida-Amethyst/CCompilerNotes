---
title: 52. Struct Tags
---

## commit log

```plaintext
Support struct tags
```

第50次commit中，我们声明一个struct是这么声明：

```c
struct {int a; double b;} example1;
```

不过其实更常见的做法是下面这种：

```c
struct int_double {int a; double b};

struct int_double example2;
```

我们是首先标记一个struct tag，然后利用这个tag去生成新的结构体。

## Parser

首先声明一个新的struct TagScope。

```c
typedef struct TagScope TagScope;
struct TagScope {
  TagScope *next;
  char *name;
  Type *ty;
};
```

然后我们来实现结构体的声明，这里可以发现，struct有两种声明方式。

```c
struct {int a; double b;} example1;  // struct 后面直接跟着一个{
struct int_double {int a; double b};  // struct后面跟着一个IDENT，再接一个{
struct int_double example2; // struct 后面跟着两个IDENT
```

```c
static Type *struct_decl(Token **rest, Token *tok) {
  Token *tag = NULL;
  // 第二和第三种情况
  if (tok->kind == TK_IDENT) {
    tag = tok;
    tag = tok->next;
  } 
  // 第三种情况
  if (tag && !equal(tok, "{")) {
    Type*ty = find_tag(tag);
    if (!ty)
      error_tok(tag, "unknown struct type");
     *rest = tok;
     return ty;
  }

  // 第一或第二种情况
  Type *ty = calloc(1, sizeof(Type));
  ty->kind = TY_STRUCT;
  struct_members(rest, tok->next, ty);
  ty->align = 1;

  // other code
  // 第二种情况
  if (tag) {
    push_tag_scope(tag, ty);
  }
  return ty;
}
```

上面的代码中利用了`find_tag`和`push_tag_scope`，现在来实现这两个。

实现find_tag之前要明确一个问题，我们的IDENT，现在除了可以是变量之外，也可以是结构体标记，因此需要将其加入到scope里面。（或者说，在一个域内定义的struct，在域外也是失效的。）

```c
struct Scope {
  Scope *next;

  /*  other fields  */
  TagScope *tags;
};
```

然后就可以实现`find_tag`了：

```c
static Type *find_tag(Token *tok) {
  for(Scope *sc = scope; sc; sc = sc->next) {
    for(TagScope *sc2 = sc->tags; sc2; sc2 = sc2->next) {
      if (equal(tok, sc2->name)) {
        return sc2->ty; 
      } 
    }
  }
  return NULL;
}
```

上面这个代码其实提示了一点，就是我们可能允许一个ident，既可以是一个变量标记，也可以是一个struct标记。

然后我们来实现`push_tag_scope`。

```c
static void push_tag_scope(Token *tok, Type *ty) {
  TagScope *sc = calloc(1, sizeof(TagScope));
  sc->name = strndup(tok->loc, tok->len);
  sc->ty = ty;
  sc->next = scope->tags;
  scope->tags = sc;
}
```

最后我们来添加测例：

```c
// struct.c
ASSERT(16, ({ struct t {int a; int b;} x; struct t y; sizeof(y); }));
ASSERT(16, ({ struct t {int a; int b;}; struct t y; sizeof(y); }));
ASSERT(2, ({ struct t {char a[2];}; { struct t {char a[4];}; } struct t y; sizeof(y); }));
ASSERT(3, ({ struct t {int x;}; int t=1; struct t y; y.x=2; t+y.x; }));
```

‍
