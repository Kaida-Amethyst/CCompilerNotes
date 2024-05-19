---
title: 55. Struct Assignment
---

## commit log

```plaintext
Add struct assignment
```

我们知道struct是可以互相赋值的，这一次我们就来解决这个问题，顺带这里也解决了一个重要问题，就是struct为什么要内存对齐。

## codegen

修改store函数即可：

```c
static void store(Type *ty) {
  pop("%rdi");
  if (ty->kind == TY_STRUCT || type->kind == TY_UNION) {
    for (int i = 0; i < typ->size; i++) {
      println("  mov %d(%%rax), %%r8b", i);
      println("  mov %%r8b, %d(%%rdi)", i);
    }
    return ;
  }
  if (ty->size == 1) {
    println("  mov %%al, (%%rdi)");
  } else {
    println("  mov %%rax, (%%rdi)");
  }
}
```

另外，还要修改`load`函数，当类型为`struct`或`union`的时候直接返回即可。

```c
static void load(Type *ty) {
  if (ty->kind == TY_ARRAY || ty->kind == TY_STRUCT || ty->kind == TY_UNION)
    return ;
  // other code
}
```

## test.sh

添加以下的`struct`测例：

```c
  ASSERT(3, ({ struct {int a,b;} x,y; x.a=3; y=x; y.a; }));
  ASSERT(7, ({ struct t {int a,b;}; struct t x; x.a=7; struct t y; struct t *z=&y; *z=x; y.a; }));
  ASSERT(7, ({ struct t {int a,b;}; struct t x; x.a=7; struct t y, *p=&x, *q=&y; *q=*p; y.a; }));
  ASSERT(5, ({ struct t {char a, b;} x, y; x.a=5; y=x; y.a; }));

  ASSERT(3, ({ struct {int a,b;} x,y; x.a=3; y=x; y.a; }));
  ASSERT(7, ({ struct t {int a,b;}; struct t x; x.a=7; struct t y; struct t *z=&y; *z=x; y.a; }));
  ASSERT(7, ({ struct t {int a,b;}; struct t x; x.a=7; struct t y, *p=&x, *q=&y; *q=*p; y.a; }));
  ASSERT(5, ({ struct t {char a, b;} x, y; x.a=5; y=x; y.a; }));
```

添加以下的`union`测例：

```c
  ASSERT(3, ({ union {int a,b;} x,y; x.a=3; y.a=5; y=x; y.a; }));
  ASSERT(3, ({ union {struct {int a,b;} c;} x,y; x.c.b=3; y.c.b=5; y=x; y.c.b; }));
```

‍
