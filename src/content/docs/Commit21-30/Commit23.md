---
title: 23. Zero Arity Function Calls
---

## commit log

```plaintext
Support zero-arity function calls
```

允许我们的编译器进行函数调用。但是这一次commit，我们的函数调用比较简单。首先，我们暂时不考虑函数声明的问题。要调用的函数暂时先使用gcc进行编译。其次，我们要调用的函数暂时只是无参数的函数。

## 思路

当我们调用一个函数的时候，例如我们在c中写：

```c
func();
```

实际上会编译成：

```x86asm
mov $0, %rax
call func
```

考虑到我们经常有类似于如下的语句：

```c
int x = func();
int y = 2 * func();
```

因此，一个函数调用应该被视为一个primary。我们修改一下范式：

```plaintext
primary : ident
        | num
        | "(" expr ")"
        | ident args?
        ;

args : "(" ")"
```

## 头文件

首先我们添加一个Node类型，并扩展Node结构体：

```c
typedef enum {
  /*  other kinds */
  ND_FUNCALL
  /*  other kinds */
}
struct Node {
  /*  other fields  */
  char *funcname;
  /*  other fields*/
}
```

## parser

主要修改`primary`：

```c
static Node *primary(Token **rest, Token *tok) {
  /*  other code */

  if (tok->kind == TK_IDENT) {
    // Function call 
    if (equal(tok->next, "(")) {                  
      Node *node = new_node(ND_FUNCALL, tok);
      node->funcname = strndup(tok->loc, tok->len);
      *rest = skip(tok->next->next, ")");
      return node;
    }   
    /*  other cases  */
  }
  /*  other code  */
}

```

## codegen

然后，修改codegen中的`gen_expr`：

```c
static void gen_expr(Node *node) {
  switch(node->kind) {
    /*  other cases  */
    case ND_FUNCALL:
      printf("  mov $0, %%rax\n");
      printf("  call %s\n", node->funcname);
      return ;
  }
  /*  other code  */
}
```

## test.sh

我们这一次commit只是实现了函数调用，没有实现函数声明和定义。那么调用的函数就只能暂时来自于外部。这里介绍一个linux命令：

```shell
$cat << EOF
> Hello Linux!
> EOF
Hello Linux!
```

cat原本的意思是显示文件，这里加上`<< EOF`，就是在之后输入若干文本，直到遇到EOF才停下，然后把输入的内容打印出来。如果希望写入某些文件，可以这么做:

```shell
$ cat > 1.txt << EOF
> Hello Linux!
> EOF
$ cat 1.txt
Hello Linux!
```

另外`gcc -xc`就是把所输入的内容当作一个c文件来进行编译。

那么我们可以在test.sh开头写上：

```bash
cat << EOF | gcc -xc -c -o tmp2.o -
int ret3() { return 3; }
int ret5() { return 5; }
EOF
```

这样一来我们就有了一个`tmp2.o`的可重定位目标文件，里面有`ret3`和`ret5`这两个函数。

记得要修改一下test.sh中的编译命令：

```bash
gcc -static -o tmp tmp.s tmp2.o
```

然后加上新的测例：

```bash
assert 3 '{ return ret3(); }'
assert 5 '{ return ret5(); }'
```

‍
