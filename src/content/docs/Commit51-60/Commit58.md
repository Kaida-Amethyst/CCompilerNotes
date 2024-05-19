---
title: 58. Short Type
---

## commit log

```plaintext
Add short type.
```

添加`short`类型。

## 头文件

```c
typedef enum {
  // ...
  TY_SHORT,
} TypeKind;

extern Type *ty_short;
```

## Type.c

```c
Type *ty_short = &(Type){TY_SHORT, 2, 2};

bool is_integer(Type *ty) {
  TypeKind k = ty->kind;
  return k == TY_CHAR || k == TY_SHORT || k == TY_INT ||
         K == TY_LONG;
}
```

## Parser

在`declspec`中添加支持：

```c
static Type *declspec(Token **rest, Token *tok) {
  // code
  if (equal(tok, "short")) {
    *rest = tok->next;
    return ty_short;
  }
  // code
}
```

## Codegen

```c
static char *argreg16[] = {"%di", "%si", "%dx", "%cx", "%r8w", "%r9w"};

static void load(Type *ty) {
  // code
  if (ty->size == 1)
    println("  movsbq (%%rax), %%rax");
  else if (ty->size == 2)
    println("  movswq (%%rax), %%rax");
  else if (ty->size == 4)
    println("  movsxd (%%rax), %%rax");
  else
    //...
}

static void store(Type *ty) {
  // code
  if (ty->size == 1) 
    println("  mov %%al, (%%rdi)");
  else if (ty->size == 2)
    println("  mov %%ax, (%%rdi)");
  else if (ty->size == 4)
    println("  mov %%eax, (%%rdi)");
  else
    // ...
  // code
}

static void store_gp(int r, int offset, int sz) {
  switch (ty->size) {
    case 1:
      //...
    case 2:
      println("  mov %s, %d(%%rbp)", argreg16[r], offset);
      return ;
    case 4:
      // ...
  }
}
```

## test.sh

```c
// function.c
int sub_short(short a, short b, short c) {
  return a - b - c;
}

int main () {
  ASSERT(1, sub_short(7, 3, 3));
}

// struct.c
int main() {
  ASSERT(4, ({ struct {char a; short b;} x; sizeof(x); }));
}

// variable.c
int main() {
  ASSERT(2, ({ short x; sizeof(x); }));
}
```

‍
